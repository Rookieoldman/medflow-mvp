"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getOrCreateDevCelador } from "@/lib/devUser";
import { redirect } from "next/navigation";

export async function markEnLaPrueba(formData: FormData) {
  const transferId = String(formData.get("transferId") ?? "");

  const transfer = await prisma.transfer.findUnique({
    where: { id: transferId },
  });

  if (!transfer) {
    throw new Error("Traslado no encontrado");
  }

  if (
    transfer.status !== "EN_CAMINO_PRUEBA" &&
    transfer.status !== "EN_ESPERA"
  ) {
    throw new Error("No se puede marcar 'En la prueba' en este estado");
  }

  await prisma.transfer.update({
    where: { id: transferId },
    data: { status: "EN_LA_PRUEBA" },
  });

  revalidatePath(`/transfer/${transferId}`);
}
export async function cancelPrueba(formData: FormData) {
  const transferId = String(formData.get("transferId") ?? "");
  const note = String(formData.get("note") ?? "").trim();

  if (!transferId) throw new Error("Falta transferId");

  const actor = await getOrCreateDevCelador();

  const t = await prisma.transfer.findUnique({ where: { id: transferId } });
  if (!t) throw new Error("Traslado no encontrado");

  if (t.status === "FINALIZADO" || t.status === "CANCELADO") return;

  if (t.assignedToId && t.assignedToId !== actor.id) {
    throw new Error("No puedes cancelar un traslado de otro celador");
  }

  await prisma.$transaction([
    prisma.incident.create({
      data: {
        transferId,
        type: "PRUEBA_CANCELADA",
        note: note || "Prueba cancelada",
        createdById: actor.id,
      },
    }),
    prisma.transfer.update({
      where: { id: transferId },
      data: {
        status: "CANCELADO",
        previousStatus: t.status,
      },
    }),
  ]);

  revalidatePath("/celador");
  revalidatePath("/tecnico");
  revalidatePath("/admin");
  revalidatePath(`/celador/transfer/${transferId}`);
  revalidatePath(`/tecnico/transfers/${transferId}`);
}