import { getShift, type ShiftName } from "@/lib/shifts";

/** Traslado finalizado serializado para el detalle al pulsar un día en el gráfico. */
export type DailyFinishedTransferDetail = {
  id: string;
  mrn: string;
  patientFullName: string;
  dob: string;
  location: string;
  testType: string;
  priority: string;
  difficulty: string;
  scope: string;
  createdAt: string;
  updatedAt: string;
  closedShift: ShiftName;
  createdByLabel: string;
  assignedToLabel: string | null;
};

const MS_DAY = 86_400_000;
const MAX_CHART_DAYS = 120;

export type DailyShiftRow = {
  /** yyyy-MM-dd (día local de finalización) */
  dayKey: string;
  /** Etiqueta corta para el eje X */
  label: string;
  MANANA: number;
  TARDE: number;
  NOCHE: number;
  total: number;
};

function startOfLocalDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Día local `yyyy-MM-dd` (misma regla que agrupa el gráfico por `updatedAt`). */
export function localDayKeyFromDate(d: Date): string {
  const x = startOfLocalDay(d);
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, "0");
  const day = String(x.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function dayKey(d: Date): string {
  return localDayKeyFromDate(d);
}

function labelFromKey(key: string): string {
  const [y, mo, da] = key.split("-").map(Number);
  const dt = new Date(y, mo - 1, da);
  return dt.toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
}

/**
 * Traslados finalizados en el período, agrupados por **día local de cierre**
 * (`updatedAt`) y **turno según la hora de ese cierre** (misma regla que en celador:
 * mañana 08–14:59, tarde 15–21:59, noche el resto).
 */
export function buildDailyShiftChartData(
  finished: { updatedAt: Date }[],
  periodStart: Date | null,
  now = new Date()
): DailyShiftRow[] {
  const buckets = new Map<string, Record<ShiftName, number>>();

  for (const t of finished) {
    const key = dayKey(t.updatedAt);
    const sh = getShift(t.updatedAt);
    if (!buckets.has(key)) {
      buckets.set(key, { MANANA: 0, TARDE: 0, NOCHE: 0 });
    }
    const b = buckets.get(key)!;
    b[sh] += 1;
  }

  const endDay = startOfLocalDay(now);
  let fromDay: Date;

  if (periodStart) {
    fromDay = startOfLocalDay(periodStart);
  } else if (finished.length === 0) {
    fromDay = new Date(endDay);
    fromDay.setDate(fromDay.getDate() - 29);
  } else {
    const minTs = Math.min(
      ...finished.map((f) => startOfLocalDay(f.updatedAt).getTime())
    );
    fromDay = new Date(minTs);
  }

  if (fromDay.getTime() > endDay.getTime()) {
    fromDay = new Date(endDay);
  }

  /* Evitar miles de barras si "todo el historial" es muy largo */
  let spanDays =
    (endDay.getTime() - fromDay.getTime()) / MS_DAY + 1;
  if (spanDays > MAX_CHART_DAYS) {
    fromDay = new Date(endDay.getTime() - (MAX_CHART_DAYS - 1) * MS_DAY);
    fromDay = startOfLocalDay(fromDay);
    spanDays = MAX_CHART_DAYS;
  }

  const out: DailyShiftRow[] = [];
  const cur = new Date(fromDay);
  while (cur.getTime() <= endDay.getTime()) {
    const key = dayKey(cur);
    const b = buckets.get(key) ?? { MANANA: 0, TARDE: 0, NOCHE: 0 };
    const total = b.MANANA + b.TARDE + b.NOCHE;
    out.push({
      dayKey: key,
      label:  labelFromKey(key),
      MANANA: b.MANANA,
      TARDE:  b.TARDE,
      NOCHE:  b.NOCHE,
      total,
    });
    cur.setDate(cur.getDate() + 1);
  }

  return out;
}
