/**
 * Turnos por hora del día:
 *   Mañana : 08:00 – 14:59
 *   Tarde  : 15:00 – 21:59
 *   Noche  : 22:00 – 07:59 (cruza medianoche)
 */

export type ShiftName = "MANANA" | "TARDE" | "NOCHE";

export const SHIFT_LABEL: Record<ShiftName, string> = {
  MANANA: "☀️ Mañana  (08–15h)",
  TARDE:  "🌆 Tarde   (15–22h)",
  NOCHE:  "🌙 Noche   (22–08h)",
};

export const SHIFT_COLOR: Record<ShiftName, string> = {
  MANANA: "bg-yellow-50 text-yellow-700 border-yellow-200",
  TARDE:  "bg-orange-50 text-orange-700 border-orange-200",
  NOCHE:  "bg-indigo-50 text-indigo-700 border-indigo-200",
};

/** Devuelve el turno en el que cae una fecha/hora dada. */
export function getShift(date: Date): ShiftName {
  const h = date.getHours();
  if (h >= 8  && h < 15) return "MANANA";
  if (h >= 15 && h < 22) return "TARDE";
  return "NOCHE";
}

/**
 * Devuelve el instante exacto en que empezó el turno actual.
 * Si es NOCHE y son las 03:00, el turno empezó ayer a las 22:00.
 */
export function getShiftStart(date: Date): Date {
  const shift = getShift(date);
  const start = new Date(date);

  if (shift === "MANANA") {
    start.setHours(8, 0, 0, 0);
  } else if (shift === "TARDE") {
    start.setHours(15, 0, 0, 0);
  } else {
    // NOCHE: empieza a las 22:00
    if (date.getHours() >= 22) {
      start.setHours(22, 0, 0, 0);
    } else {
      // Antes de las 08:00 — el turno empezó ayer a las 22:00
      start.setDate(start.getDate() - 1);
      start.setHours(22, 0, 0, 0);
    }
  }

  return start;
}

/** True si breakUsedAt pertenece al turno actual (≥ shiftStart). */
export function breakUsedInCurrentShift(breakUsedAt: Date | null, now: Date): boolean {
  if (!breakUsedAt) return false;
  return breakUsedAt >= getShiftStart(now);
}
