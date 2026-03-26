"use server";

import { prisma } from "@/lib/prisma";
import { recordEvent } from "@/lib/transferEvents";
import { emitTransferEvent } from "@/lib/eventBus";
import { sendPushToUser } from "@/lib/webpush";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { revalidatePath } from "next/cache";
import { TransferStatus } from "@prisma/client";

const ALLOWED_TRANSITIONS: Record<string, TransferStatus> = {
  EN_CURSO: "EN_PRUEBA",
};

export async function setTransferStatus(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!(session?.user as any)?.id || (session?.user as any)?.role !== "TECNICO") {
    throw new Error("No autorizado");
  }
  const tecnicoId  = (session!.user as any).id as string;
  const transferId = String(formData.get("transferId") ?? "");
  const next       = String(formData.get("next") ?? "") as TransferStatus;

  if (!transferId || !next) throw new Error("Faltan parámetros");

  const transfer = await prisma.transfer.findUnique({ where: { id: transferId } });
  if (!transfer) throw new Error("Traslado no encontrado");
  if (transfer.createdById !== tecnicoId) throw new Error("No eres el técnico de este traslado");

  const expected = ALLOWED_TRANSITIONS[transfer.status];
  if (expected !== next) throw new Error(`Transición ${transfer.status} → ${next} no permitida`);

  await prisma.transfer.update({
    where: { id: transferId },
    data: { status: next },
  });

  const NOTE: Record<string, string> = {
    EN_PRUEBA: "Paciente en la sala de prueba",
  };

  await recordEvent(transferId, tecnicoId, next, transfer.status, NOTE[next]);

  emitTransferEvent({
    type:       "transfer:status",
    transferId,
    status:     next,
    tecnicoId,
    celadorId:  transfer.assignedToId ?? undefined,
    mrn:        transfer.mrn,
    patientName: transfer.patientFullName,
  });

  // Push al celador cuando el paciente está en la sala (EN_PRUEBA)
  if (next === "EN_PRUEBA" && transfer.assignedToId) {
    await sendPushToUser(transfer.assignedToId, {
      title: "🔬 Paciente en la sala",
      body:  `${transfer.patientFullName} · finaliza el traslado cuando termine la prueba`,
      url:   "/celador",
    });
  }

  revalidatePath("/tecnico");
  revalidatePath(`/tecnico/transfers/${transferId}`);
  revalidatePath("/admin");
  revalidatePath(`/admin/transfer/${transferId}`);
}
