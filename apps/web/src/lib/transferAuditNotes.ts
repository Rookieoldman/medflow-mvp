/** Texto fijo en `TransferEvent.note` para detectar en historial / informes */
export const NOTE_LIBERACION_COLA =
  "Liberación a cola: el celador asignado devolvió el traslado a solicitado sin asignar (cambio de turno o delegación).";

export function isLiberacionColaNote(note: string | null | undefined): boolean {
  const n = note ?? "";
  return n.includes("Liberación a cola:") || n.includes("Liberado a la cola");
}
