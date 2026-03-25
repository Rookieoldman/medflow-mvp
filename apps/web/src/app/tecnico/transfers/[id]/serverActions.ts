"use server";

import { prisma } from "@/lib/prisma";
import { recordEvent } from "@/lib/transferEvents";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";

async function getTecnicoSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "TECNICO") {
    throw new Error("No autorizado");
  }
  return session.user.id;
}

export async function cancelPrueba(formData: FormData) {
  const tecnicoId = await getTecnicoSession();

  const transferId = String(formData.get("transferId") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  if (!transferId) throw new Error("Falta transferId");

  const t = await prisma.transfer.findUnique({ where: { id: transferId } });
  if (!t) throw new Error("Traslado no encontrado");

  // Solo el técnico creador puede cancelar
  if (t.createdById !== tecnicoId) {
    throw new Error("No puedes cancelar un traslado que no has creado");
  }

  if (t.status === "FINALIZADO" || t.status === "CANCELADO") return;

  await prisma.$transaction([
    prisma.incident.create({
      data: {
        transferId,
        type: "PRUEBA_CANCELADA",
        note: note || "Cancelado por técnico",
        createdById: tecnicoId,
      },
    }),
    prisma.transfer.update({
      where: { id: transferId },
      data: { status: "CANCELADO", previousStatus: t.status },
    }),
  ]);

  await recordEvent(transferId, tecnicoId, "CANCELADO", t.status, note || "Cancelado por técnico");

  revalidatePath("/tecnico");
  revalidatePath("/celador");
  revalidatePath("/admin");
  revalidatePath(`/tecnico/transfers/${transferId}`);
}
