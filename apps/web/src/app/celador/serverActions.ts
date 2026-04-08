"use server";

import { prisma } from "@/lib/prisma";
import { recordEvent } from "@/lib/transferEvents";
import { emitTransferEvent } from "@/lib/eventBus";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import {
  breakUsedInCurrentShift,
  getShift,
  SHIFT_LABEL,
  type ShiftName,
} from "@/lib/shifts";
import { NOTE_LIBERACION_COLA } from "@/lib/transferAuditNotes";
import {
  assignFromQueuePrecheck,
  createIncidentPrecheck,
  pauseTransferPrecheck,
} from "@/lib/celadorActionGuards";
import { Shift, type TransferStatus } from "@prisma/client";

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

  // Verificar que el celador no está de descanso
  const celadorUser = await prisma.user.findUnique({
    where:  { id: celadorId },
    select: { breakUntil: true },
  });
  if (celadorUser?.breakUntil && celadorUser.breakUntil > new Date()) {
    throw new Error("No puedes asignarte traslados durante el descanso");
  }

  const transfer = await prisma.transfer.findUnique({
    where:  { id: transferId },
    include: { acceptance: true },
  });

  if (!transfer) throw new Error("Traslado no encontrado");

  const pre = assignFromQueuePrecheck(transfer);
  if (!pre.ok) throw new Error(pre.message);

  const { fromStatus, toStatus } = await prisma.$transaction(async (tx) => {
    const t2 = await tx.transfer.findUnique({
      where:  { id: transferId },
      include: { acceptance: true },
    });
    if (!t2) throw new Error("Traslado no encontrado");

    const pre2 = assignFromQueuePrecheck(t2);
    if (!pre2.ok) throw new Error(pre2.message);

    let next: TransferStatus;
    if (t2.status === "SOLICITADO") {
      next = t2.requiresAcceptance ? "ASIGNADO" : "EN_CURSO";
    } else {
      next = t2.status;
    }

    const stripStale = t2.status === "ASIGNADO" && !!t2.acceptance;
    if (stripStale) {
      await tx.transferAcceptance.deleteMany({ where: { transferId } });
    }

    const updated = await tx.transfer.updateMany({
      where: { id: transferId, assignedToId: null },
      data:  { assignedToId: celadorId, status: next },
    });

    if (updated.count !== 1) {
      throw new Error(
        "Otro celador se ha asignado este traslado. La lista se actualizará."
      );
    }

    return { fromStatus: t2.status, toStatus: next };
  });

  await recordEvent(
    transferId,
    celadorId,
    toStatus,
    fromStatus,
    fromStatus === "SOLICITADO"
      ? undefined
      : "Asignado a nuevo celador (antes sin responsable)"
  );

  emitTransferEvent({
    type:        "transfer:assigned",
    transferId,
    status:      toStatus,
    celadorId,
    tecnicoId:   transfer.createdById,
    mrn:         transfer.mrn,
    patientName: transfer.patientFullName,
  });

  revalidatePath("/celador");
}

/** Devuelve el traslado a la cola (otro compañero / cambio de turno). No aplica en EN_PRUEBA. */
export async function releaseTransferToPool(formData: FormData) {
  const transferId = String(formData.get("transferId") ?? "");
  if (!transferId) throw new Error("Falta transferId");

  const celadorId = await getCeladorSession();

  const transfer = await prisma.transfer.findUnique({
    where: { id: transferId },
    include: { acceptance: true },
  });

  if (!transfer) throw new Error("Traslado no encontrado");

  if (transfer.assignedToId !== celadorId) {
    throw new Error("Solo el celador asignado puede liberar el traslado");
  }

  const allowed: TransferStatus[] = ["ASIGNADO", "EN_CURSO", "PAUSADO"];
  if (!allowed.includes(transfer.status)) {
    throw new Error(
      "No se puede liberar en este estado (p. ej. en prueba use coordinación con sala)"
    );
  }

  await prisma.$transaction([
    prisma.transferAcceptance.deleteMany({ where: { transferId } }),
    prisma.transfer.update({
      where: { id: transferId },
      data:  {
        assignedToId:   null,
        status:         "SOLICITADO",
        previousStatus: null,
      },
    }),
  ]);

  await recordEvent(
    transferId,
    celadorId,
    "SOLICITADO",
    transfer.status,
    NOTE_LIBERACION_COLA
  );

  emitTransferEvent({
    type:        "transfer:released",
    transferId,
    status:      "SOLICITADO",
    tecnicoId:   transfer.createdById,
    mrn:         transfer.mrn,
  });

  revalidatePath("/celador");
  revalidatePath(`/celador/transfer/${transferId}`);
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

  const pauseOk = pauseTransferPrecheck(transfer.status);
  if (!pauseOk.ok) throw new Error(pauseOk.message);

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

  emitTransferEvent({
    type:        "transfer:status",
    transferId,
    status:      "EN_CURSO",
    celadorId,
    tecnicoId:   transfer.createdById,
    mrn:         transfer.mrn,
    patientName: transfer.patientFullName,
  });

  revalidatePath("/celador");
  revalidatePath(`/celador/transfer/${transferId}`);
}

/* ── Descanso y turno (mismo módulo que el resto de acciones: evita IDs rotos con Turbopack) ── */
const BREAK_MINUTES = 20;
const MIN_AVAILABLE = 2;

export async function startBreak() {
  const celadorId = await getCeladorSession();
  const now       = new Date();

  const user = await prisma.user.findUnique({
    where:  { id: celadorId },
    select: { breakUsedAt: true },
  });

  if (breakUsedInCurrentShift(user?.breakUsedAt ?? null, now)) {
    const shift = getShift(now);
    throw new Error(`Ya has usado el descanso del turno de ${SHIFT_LABEL[shift]}`);
  }

  const availableCount = await prisma.user.count({
    where: {
      id:     { not: celadorId },
      role:   "CELADOR",
      active: true,
      OR:     [{ breakUntil: null }, { breakUntil: { lte: now } }],
    },
  });

  if (availableCount < MIN_AVAILABLE) {
    throw new Error(
      `No puedes iniciar el descanso: deben quedar al menos ${MIN_AVAILABLE} celadores disponibles`
    );
  }

  const breakUntil = new Date(now.getTime() + BREAK_MINUTES * 60 * 1000);

  await prisma.user.update({
    where: { id: celadorId },
    data:  { breakUntil, breakUsedAt: now },
  });

  emitTransferEvent({ type: "celador:break", celadorId });
  revalidatePath("/celador");
}

export async function endBreak() {
  const celadorId = await getCeladorSession();

  await prisma.user.update({
    where: { id: celadorId },
    data:  { breakUntil: null },
  });

  emitTransferEvent({ type: "celador:break", celadorId });
  revalidatePath("/celador");
}

/** El celador cambia su turno activo; resetea descanso. */
export async function setOwnShift(shift: ShiftName | "OFF") {
  const celadorId = await getCeladorSession();

  await prisma.user.update({
    where: { id: celadorId },
    data:  {
      activeShift: shift === "OFF" ? null : (shift as Shift),
      breakUsedAt: shift === "OFF" ? undefined : null,
      breakUntil:  shift === "OFF" ? null : undefined,
    },
  });

  emitTransferEvent({ type: "celador:break", celadorId });
  revalidatePath("/celador");
  revalidatePath("/admin");
}