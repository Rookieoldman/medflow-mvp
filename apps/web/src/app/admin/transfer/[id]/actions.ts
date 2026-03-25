"use server";

import { prisma } from "@/lib/prisma";
import { recordEvent } from "@/lib/transferEvents";
import { emitTransferEvent } from "@/lib/eventBus";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    throw new Error("No autorizado");
  }
  return session.user.id;
}

export async function assignTransfer(formData: FormData) {
  const adminId    = await requireAdmin();
  const transferId = String(formData.get("transferId") ?? "");
  const celadorId  = String(formData.get("celadorId")  ?? "");

  if (!transferId || !celadorId) throw new Error("Faltan parámetros");

  const transfer = await prisma.transfer.findUnique({ where: { id: transferId } });
  if (!transfer) throw new Error("Traslado no encontrado");

  const isFinal = ["FINALIZADO", "CANCELADO"].includes(transfer.status);
  if (isFinal) throw new Error("No se puede reasignar un traslado finalizado");

  const nextStatus = transfer.requiresAcceptance ? "ASIGNADO" : "EN_CURSO";

  await prisma.transfer.update({
    where: { id: transferId },
    data: {
      assignedToId: celadorId,
      status:       nextStatus,
    },
  });

  await recordEvent(
    transferId,
    adminId,
    nextStatus,
    transfer.status,
    "Asignado manualmente por admin"
  );

  emitTransferEvent({
    type:       "transfer:assigned",
    transferId,
    status:     nextStatus,
    celadorId,
    tecnicoId:  transfer.createdById,
    mrn:        transfer.mrn,
    patientName: transfer.patientFullName,
  });

  revalidatePath(`/admin/transfer/${transferId}`);
  revalidatePath("/admin/transfers");
  revalidatePath("/celador");
}
