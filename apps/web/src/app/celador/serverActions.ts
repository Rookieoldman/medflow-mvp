"use server";

import { prisma } from "@/lib/prisma";
import { recordEvent } from "@/lib/transferEvents";
import { emitTransferEvent } from "@/lib/eventBus";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";

/* ============================================================
   ESTADOS SIMPLIFICADOS
============================================================ */
/*
SOLICITADO
ASIGNADO        (solo si requiere firma)
EN_CURSO
EN_PRUEBA
FINALIZADO
CANCELADO
PAUSADO
*/

// EN_PRUEBA lo marca el técnico; FINALIZADO lo marca el celador
const ALLOWED: Record<string, string[]> = {
  SOLICITADO: ["ASIGNADO", "EN_CURSO"],
  ASIGNADO:   ["EN_CURSO"],
  EN_CURSO:   ["PAUSADO"],
  PAUSADO:    ["EN_CURSO"],
  EN_PRUEBA:  ["FINALIZADO"],
};

/* ============================================================
   HELPERS
============================================================ */
async function getCeladorSession() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || session.user.role !== "CELADOR") {
    throw new Error("No autorizado");
  }

  return session.user.id;
}

/* ============================================================
   ASIGNARSE UN TRASLADO
   - Si NO requiere firma → pasa directo a EN_CURSO
   - Si requiere firma → queda en ASIGNADO
============================================================ */
export async function assignToMe(formData: FormData) {
  const transferId = String(formData.get("transferId") ?? "");
  if (!transferId) throw new Error("Falta transferId");

  const celadorId = await getCeladorSession();

  const transfer = await prisma.transfer.findUnique({
    where: { id: transferId },
  });

  if (!transfer) throw new Error("Traslado no encontrado");

  if (transfer.assignedToId) {
    throw new Error("Traslado ya asignado");
  }

  const nextStatus = transfer.requiresAcceptance ? "ASIGNADO" : "EN_CURSO";

  await prisma.transfer.update({
    where: { id: transferId },
    data: { assignedToId: celadorId, status: nextStatus },
  });

  await recordEvent(transferId, celadorId, nextStatus, transfer.status);

  emitTransferEvent({
    type:       "transfer:assigned",
    transferId,
    status:     nextStatus,
    celadorId,
    tecnicoId:  transfer.createdById,
    mrn:        transfer.mrn,
    patientName: transfer.patientFullName,
  });

  revalidatePath("/celador");
}

/* ============================================================
   CAMBIO DE ESTADO GENERAL
============================================================ */
export async function setStatus(formData: FormData) {
  const transferId = String(formData.get("transferId") ?? "");
  const next = String(formData.get("next") ?? "");

  if (!transferId || !next) {
    throw new Error("Faltan parámetros");
  }

  const celadorId = await getCeladorSession();

  const transfer = await prisma.transfer.findUnique({
    where: { id: transferId },
  });

  if (!transfer) throw new Error("Traslado no encontrado");

  if (transfer.assignedToId !== celadorId) {
    throw new Error("No puedes modificar este traslado");
  }

  const allowed = ALLOWED[transfer.status] ?? [];
  if (!allowed.includes(next)) {
    throw new Error(
      `Transición no permitida: ${transfer.status} → ${next}`
    );
  }

  await prisma.transfer.update({
    where: { id: transferId },
    data: { status: next as any },
  });

  await recordEvent(transferId, celadorId, next as any, transfer.status);

  emitTransferEvent({
    type:       "transfer:status",
    transferId,
    status:     next,
    celadorId,
    tecnicoId:  transfer.createdById,
    mrn:        transfer.mrn,
    patientName: transfer.patientFullName,
  });

  revalidatePath("/celador");
}

/* ============================================================
   PAUSAR / REANUDAR
============================================================ */
export async function pauseTransfer(formData: FormData) {
  const transferId = String(formData.get("transferId") ?? "");
  if (!transferId) throw new Error("Falta transferId");

  const celadorId = await getCeladorSession();

  const transfer = await prisma.transfer.findUnique({
    where: { id: transferId },
  });

  if (!transfer) throw new Error("Traslado no encontrado");

  if (transfer.assignedToId !== celadorId) {
    throw new Error("No puedes pausar este traslado");
  }

  if (transfer.status === "PAUSADO") return;

  await prisma.transfer.update({
    where: { id: transferId },
    data: { previousStatus: transfer.status, status: "PAUSADO" },
  });

  await recordEvent(transferId, celadorId, "PAUSADO", transfer.status);

  revalidatePath("/celador");
}

export async function resumeTransfer(formData: FormData) {
  const transferId = String(formData.get("transferId") ?? "");
  if (!transferId) throw new Error("Falta transferId");

  const celadorId = await getCeladorSession();

  const transfer = await prisma.transfer.findUnique({
    where: { id: transferId },
  });

  if (!transfer) throw new Error("Traslado no encontrado");

  if (transfer.assignedToId !== celadorId) {
    throw new Error("No puedes reanudar este traslado");
  }

  if (transfer.status !== "PAUSADO") return;

  const resumeStatus = transfer.previousStatus ?? "EN_CURSO";

  await prisma.transfer.update({
    where: { id: transferId },
    data: { status: resumeStatus, previousStatus: null },
  });

  await recordEvent(transferId, celadorId, resumeStatus, "PAUSADO");

  revalidatePath("/celador");
}

/* ============================================================
   ACEPTACIÓN (FIRMA) — OPCIONAL
============================================================ */
export async function acceptTransfer(formData: FormData) {
  const transferId = String(formData.get("transferId") ?? "");
  const signerName = String(formData.get("signerName") ?? "").trim();
  const signerRole = String(formData.get("signerRole") ?? "").trim();
  const signatureData = String(formData.get("signatureData") ?? "");

  if (!transferId || !signerName || !signatureData) {
    throw new Error("Datos de firma incompletos");
  }

  const celadorId = await getCeladorSession();

  const transfer = await prisma.transfer.findUnique({
    where: { id: transferId },
    include: { acceptance: true },
  });

  if (!transfer) throw new Error("Traslado no encontrado");

  if (!transfer.requiresAcceptance) {
    throw new Error("Este traslado no requiere firma");
  }

  if (transfer.status !== "ASIGNADO") {
    throw new Error("El traslado no está pendiente de firma");
  }

  if (transfer.acceptance) {
    throw new Error("Ya firmado");
  }

  await prisma.$transaction([
    prisma.transferAcceptance.create({
      data: { transferId, signerName, signerRole: signerRole || null, signatureData, celadorId },
    }),
    prisma.transfer.update({
      where: { id: transferId },
      data: { status: "EN_CURSO" },
    }),
  ]);

  await recordEvent(transferId, celadorId, "EN_CURSO", "ASIGNADO", `Firmado por: ${signerName}`);

  revalidatePath("/celador");
}