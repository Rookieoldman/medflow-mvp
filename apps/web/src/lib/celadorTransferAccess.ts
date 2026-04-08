import type { TransferStatus } from "@prisma/client";

/** Traslados en cola (sin celador): el celador puede abrir la ficha antes de asignarse. */
const QUEUE_STATUSES: TransferStatus[] = [
  "SOLICITADO",
  "ASIGNADO",
  "EN_CURSO",
  "PAUSADO",
];

/**
 * El celador puede ver la ficha si es el asignado (cualquier estado) o si el traslado
 * está en cola pública con los mismos criterios que GET /api/celador/transfers.
 */
export function celadorMayViewTransferDetail(
  transfer: { assignedToId: string | null; status: TransferStatus },
  celadorId: string
): boolean {
  if (transfer.assignedToId === celadorId) return true;
  if (
    transfer.assignedToId === null &&
    QUEUE_STATUSES.includes(transfer.status)
  ) {
    return true;
  }
  return false;
}
