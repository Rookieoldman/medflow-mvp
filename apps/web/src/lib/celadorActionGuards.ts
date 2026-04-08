import type { TransferStatus } from "@prisma/client";

/** Precheck antes de asignar desde la cola (sin condición de carrera; el update atómico es aparte). */
export function assignFromQueuePrecheck(transfer: {
  assignedToId: string | null;
  status: TransferStatus;
}): { ok: true } | { ok: false; message: string } {
  if (transfer.assignedToId) {
    return { ok: false, message: "Traslado ya asignado" };
  }
  if (
    transfer.status === "FINALIZADO" ||
    transfer.status === "CANCELADO" ||
    transfer.status === "EN_PRUEBA"
  ) {
    return {
      ok: false,
      message: "Este traslado no está disponible para asignación",
    };
  }
  return { ok: true };
}

export function pauseTransferPrecheck(
  status: TransferStatus
): { ok: true } | { ok: false; message: string } {
  if (status === "PAUSADO") {
    return { ok: false, message: "Ya está pausado" };
  }
  if (status !== "EN_CURSO") {
    return { ok: false, message: "Solo se puede pausar un traslado en curso" };
  }
  return { ok: true };
}

export function createIncidentPrecheck(
  transfer: { assignedToId: string | null; status: TransferStatus },
  celadorId: string
): { ok: true } | { ok: false; message: string } {
  if (transfer.assignedToId !== celadorId) {
    return {
      ok: false,
      message: transfer.assignedToId
        ? "No puedes registrar incidencias en un traslado de otro celador"
        : "Debes tener el traslado asignado para registrar una incidencia",
    };
  }
  if (transfer.status === "FINALIZADO" || transfer.status === "CANCELADO") {
    return {
      ok: false,
      message: "No se pueden registrar incidencias en un traslado cerrado",
    };
  }
  return { ok: true };
}
