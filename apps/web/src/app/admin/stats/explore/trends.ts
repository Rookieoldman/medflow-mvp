import { prisma } from "@/lib/prisma";
import type { StatsScopeKey } from "@/lib/adminStatsPeriod";
import {
  parseDateStartLocal,
  parseDateEndLocal,
  formatDateOnlyLocal,
  type ExploreDim,
  type ExploreKpi,
} from "@/lib/statsExplore";
import type { Prisma } from "@prisma/client";

function scopeWhere(scope: StatsScopeKey): Prisma.TransferWhereInput {
  return scope ? { scope: scope as "PLANTA" | "URGENCIAS" } : {};
}

const MS_DAY = 86_400_000;

const TOP_BREAKDOWN = 6;

const PALETTE = [
  "#111827",
  "#16a34a",
  "#2563eb",
  "#9333ea",
  "#ca8a04",
  "#0891b2",
  "#64748b",
];

export type TrendGranularity = "day" | "week" | "month";

export type TrendLineSpec = {
  id:    string;
  name:  string;
  color: string;
};

/** Eje Y: conteos enteros, minutos (media) o porcentaje */
export type TrendValueKind = "count" | "minutes" | "percent";

/** Punto del eje temporal; cada serie usa `values[id]` (null = sin dato en ese bucket) */
export type TrendDatum = {
  key:    string;
  label:  string;
  values: Record<string, number | null>;
};

export type ExploreTrendsContext = {
  view: string;
  kpi?: string;
  dim?: string;
  val?: string;
};

export type ExploreTrendsResult = {
  granularity:    TrendGranularity;
  valueKind:      TrendValueKind;
  /** Descripción de la métrica (p. ej. «Finalizados por fecha de cierre») */
  metricTitle:    string;
  metricSubtitle?: string;
  lines:          TrendLineSpec[];
  points:         TrendDatum[];
};

function daysInclusive(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / MS_DAY) + 1;
}

function startOfWeekMonday(d: Date): Date {
  const x = new Date(d);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x;
}

function monthKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/** `dailyUntil`: hasta cuántos días de rango usar bucket diario (p. ej. 120 para métricas tipo SLA) */
export function pickGranularity(
  from: Date,
  to: Date,
  dailyUntil = 62
): TrendGranularity {
  const n = daysInclusive(from, to);
  if (n <= dailyUntil) return "day";
  if (n <= 450) return "week";
  return "month";
}

const ANALYTIC_KPIS_FOR_DAILY_BUCKETS = new Set<string>([
  "success_among_closed",
  "completion_vs_created",
]);

function labelFor(mode: TrendGranularity, key: string): string {
  if (mode === "day" || mode === "week") {
    const d = parseDateStartLocal(key);
    return d.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
  }
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString("es-ES", { month: "short", year: "numeric" });
}

function bucketKey(mode: TrendGranularity, date: Date): string {
  if (mode === "day") return formatDateOnlyLocal(date);
  if (mode === "week") return formatDateOnlyLocal(startOfWeekMonday(date));
  return monthKey(date);
}

function orderedAxis(from: Date, to: Date, mode: TrendGranularity): string[] {
  const ordered: string[] = [];
  if (mode === "day") {
    for (let t = from.getTime(); t <= to.getTime(); t += MS_DAY) {
      ordered.push(formatDateOnlyLocal(new Date(t)));
    }
  } else if (mode === "week") {
    let cur = startOfWeekMonday(from);
    const endT = to.getTime();
    while (cur.getTime() <= endT) {
      ordered.push(formatDateOnlyLocal(cur));
      cur = new Date(cur.getTime() + 7 * MS_DAY);
    }
  } else {
    let cur = new Date(from.getFullYear(), from.getMonth(), 1);
    const end = new Date(to.getFullYear(), to.getMonth(), 1);
    while (cur <= end) {
      ordered.push(monthKey(cur));
      cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
    }
  }
  return ordered;
}

function mergeAxis(ordered: string[], extra: Iterable<string>): string[] {
  const set = new Set(ordered);
  for (const k of extra) set.add(k);
  const out = [...set];
  out.sort();
  return out;
}

function isExploreDim(s: string | undefined): s is ExploreDim {
  return (
    s === "status" ||
    s === "testType" ||
    s === "priority" ||
    s === "difficulty" ||
    s === "scope"
  );
}

type BreakdownField = "status" | "testType" | "priority" | "difficulty" | "scope";

function dimToField(dim: ExploreDim): BreakdownField {
  if (dim === "status") return "status";
  if (dim === "testType") return "testType";
  if (dim === "priority") return "priority";
  if (dim === "difficulty") return "difficulty";
  return "scope";
}

function singleLineResult(
  mode: TrendGranularity,
  ordered: string[],
  map: Map<string, number>,
  line: TrendLineSpec,
  metricTitle: string,
  metricSubtitle?: string
): ExploreTrendsResult {
  const points: TrendDatum[] = ordered.map((key) => ({
    key,
    label: labelFor(mode, key),
    values: { [line.id]: map.get(key) ?? 0 },
  }));
  return {
    granularity: mode,
    valueKind:   "count",
    metricTitle,
    metricSubtitle,
    lines: [line],
    points,
  };
}

function singleMeasureLineResult(
  mode: TrendGranularity,
  ordered: string[],
  map: Map<string, number | null>,
  line: TrendLineSpec,
  metricTitle: string,
  valueKind: "minutes" | "percent",
  metricSubtitle?: string
): ExploreTrendsResult {
  const points: TrendDatum[] = ordered.map((key) => ({
    key,
    label: labelFor(mode, key),
    values: { [line.id]: map.has(key) ? (map.get(key) ?? null) : null },
  }));
  return {
    granularity: mode,
    valueKind,
    metricTitle,
    metricSubtitle,
    lines: [line],
    points,
  };
}

/** Resumen: cuatro métricas en paralelo (vista genérica) */
async function loadSummaryTrends(
  from: Date,
  to: Date,
  sw: Prisma.TransferWhereInput,
  scope: StatsScopeKey,
  mode: TrendGranularity
): Promise<ExploreTrendsResult> {
  const [createdRows, finishedRows, cancelledRows, incidentRows] = await Promise.all([
    prisma.transfer.findMany({
      where: { createdAt: { gte: from, lte: to }, ...sw },
      select: { createdAt: true },
    }),
    prisma.transfer.findMany({
      where: { status: "FINALIZADO", updatedAt: { gte: from, lte: to }, ...sw },
      select: { updatedAt: true },
    }),
    prisma.transfer.findMany({
      where: { status: "CANCELADO", updatedAt: { gte: from, lte: to }, ...sw },
      select: { updatedAt: true },
    }),
    prisma.incident.findMany({
      where: {
        createdAt: { gte: from, lte: to },
        ...(scope ? { transfer: { scope: scope as "PLANTA" | "URGENCIAS" } } : {}),
      },
      select: { createdAt: true },
    }),
  ]);

  const cMap = new Map<string, number>();
  const fMap = new Map<string, number>();
  const xMap = new Map<string, number>();
  const iMap = new Map<string, number>();

  for (const r of createdRows) {
    const k = bucketKey(mode, r.createdAt);
    cMap.set(k, (cMap.get(k) ?? 0) + 1);
  }
  for (const r of finishedRows) {
    const k = bucketKey(mode, r.updatedAt);
    fMap.set(k, (fMap.get(k) ?? 0) + 1);
  }
  for (const r of cancelledRows) {
    const k = bucketKey(mode, r.updatedAt);
    xMap.set(k, (xMap.get(k) ?? 0) + 1);
  }
  for (const r of incidentRows) {
    const k = bucketKey(mode, r.createdAt);
    iMap.set(k, (iMap.get(k) ?? 0) + 1);
  }

  let ordered = orderedAxis(from, to, mode);
  ordered = mergeAxis(ordered, [...cMap.keys(), ...fMap.keys(), ...xMap.keys(), ...iMap.keys()]);

  const lines: TrendLineSpec[] = [
    { id: "created", name: "Creados", color: "#111827" },
    { id: "finished", name: "Finalizados", color: "#16a34a" },
    { id: "cancelled", name: "Cancelados", color: "#dc2626" },
    { id: "incidents", name: "Incidencias", color: "#9333ea" },
  ];

  const points: TrendDatum[] = ordered.map((key) => ({
    key,
    label: labelFor(mode, key),
    values: {
      created:   cMap.get(key) ?? 0,
      finished:  fMap.get(key) ?? 0,
      cancelled: xMap.get(key) ?? 0,
      incidents: iMap.get(key) ?? 0,
    },
  }));

  return {
    granularity: mode,
    valueKind:   "count",
    metricTitle:
      "Resumen: creados (alta), finalizados y cancelados (cierre), incidencias (registro)",
    lines,
    points,
  };
}

/** Siempre un punto por día natural (fecha local de cierre): tiempo medio vs día */
async function loadAvgClosureTimeTrends(
  from: Date,
  to: Date,
  sw: Prisma.TransferWhereInput
): Promise<ExploreTrendsResult> {
  const mode = "day" as const;
  const rows = await prisma.transfer.findMany({
    where: { status: "FINALIZADO", updatedAt: { gte: from, lte: to }, ...sw },
    select: { createdAt: true, updatedAt: true },
  });
  const sumMap = new Map<string, number>();
  const cntMap = new Map<string, number>();
  for (const r of rows) {
    const k = bucketKey(mode, r.updatedAt);
    const mins = (r.updatedAt.getTime() - r.createdAt.getTime()) / 60000;
    sumMap.set(k, (sumMap.get(k) ?? 0) + mins);
    cntMap.set(k, (cntMap.get(k) ?? 0) + 1);
  }
  const avgMap = new Map<string, number | null>();
  for (const k of new Set([...sumMap.keys(), ...cntMap.keys()])) {
    const c = cntMap.get(k) ?? 0;
    const s = sumMap.get(k) ?? 0;
    avgMap.set(k, c > 0 ? Math.round((s / c) * 10) / 10 : null);
  }
  const ordered = mergeAxis(orderedAxis(from, to, mode), avgMap.keys());
  for (const k of ordered) {
    if (!avgMap.has(k)) avgMap.set(k, null);
  }
  return singleMeasureLineResult(
    mode,
    ordered,
    avgMap,
    { id: "v0", name: "Tiempo medio (min)", color: "#0f766e" },
    "Tiempo medio (alta → cierre) frente al día de cierre",
    "minutes",
    "Cada día del eje X agrupa los cierres de ese día (hora local); el valor Y es la media en minutos. Si no hubo cierres, no hay dato."
  );
}

async function loadSuccessAmongClosedTrends(
  from: Date,
  to: Date,
  sw: Prisma.TransferWhereInput,
  mode: TrendGranularity
): Promise<ExploreTrendsResult> {
  const [finRows, canRows] = await Promise.all([
    prisma.transfer.findMany({
      where: { status: "FINALIZADO", updatedAt: { gte: from, lte: to }, ...sw },
      select: { updatedAt: true },
    }),
    prisma.transfer.findMany({
      where: { status: "CANCELADO", updatedAt: { gte: from, lte: to }, ...sw },
      select: { updatedAt: true },
    }),
  ]);
  const finMap = new Map<string, number>();
  const canMap = new Map<string, number>();
  for (const r of finRows) {
    const k = bucketKey(mode, r.updatedAt);
    finMap.set(k, (finMap.get(k) ?? 0) + 1);
  }
  for (const r of canRows) {
    const k = bucketKey(mode, r.updatedAt);
    canMap.set(k, (canMap.get(k) ?? 0) + 1);
  }
  const ordered = mergeAxis(orderedAxis(from, to, mode), [
    ...finMap.keys(),
    ...canMap.keys(),
  ]);
  const rateMap = new Map<string, number | null>();
  for (const k of ordered) {
    const f = finMap.get(k) ?? 0;
    const c = canMap.get(k) ?? 0;
    rateMap.set(
      k,
      f + c > 0 ? Math.round((100 * f) / (f + c) * 10) / 10 : null
    );
  }
  return singleMeasureLineResult(
    mode,
    ordered,
    rateMap,
    { id: "v0", name: "% finalizados entre cierres", color: "#15803d" },
    "Porcentaje de finalizados entre todos los cierres (finalizado + cancelado) en cada intervalo",
    "percent",
    "Solo cuenta traslados cerrados en el intervalo (fecha de cierre)."
  );
}

async function loadCompletionVsCreatedTrends(
  from: Date,
  to: Date,
  sw: Prisma.TransferWhereInput,
  mode: TrendGranularity
): Promise<ExploreTrendsResult> {
  const [creRows, finRows] = await Promise.all([
    prisma.transfer.findMany({
      where: { createdAt: { gte: from, lte: to }, ...sw },
      select: { createdAt: true },
    }),
    prisma.transfer.findMany({
      where: { status: "FINALIZADO", updatedAt: { gte: from, lte: to }, ...sw },
      select: { updatedAt: true },
    }),
  ]);
  const creMap = new Map<string, number>();
  const finMap = new Map<string, number>();
  for (const r of creRows) {
    const k = bucketKey(mode, r.createdAt);
    creMap.set(k, (creMap.get(k) ?? 0) + 1);
  }
  for (const r of finRows) {
    const k = bucketKey(mode, r.updatedAt);
    finMap.set(k, (finMap.get(k) ?? 0) + 1);
  }
  const ordered = mergeAxis(orderedAxis(from, to, mode), [
    ...creMap.keys(),
    ...finMap.keys(),
  ]);
  const pctMap = new Map<string, number | null>();
  for (const k of ordered) {
    const c = creMap.get(k) ?? 0;
    const f = finMap.get(k) ?? 0;
    pctMap.set(k, c > 0 ? Math.round((100 * f) / c * 10) / 10 : null);
  }
  return singleMeasureLineResult(
    mode,
    ordered,
    pctMap,
    { id: "v0", name: "% finalizados / creados", color: "#4f46e5" },
    "Por intervalo: finalizados (cierre ese día o semana) respecto a altas ese mismo intervalo",
    "percent",
    "Si no hubo altas en el intervalo pero sí cierres, no se calcula ratio (valor vacío)."
  );
}

async function loadKpiTrends(
  kpi: ExploreKpi,
  from: Date,
  to: Date,
  sw: Prisma.TransferWhereInput,
  scope: StatsScopeKey,
  mode: TrendGranularity
): Promise<ExploreTrendsResult> {
  const snapSubtitle =
    "El listado superior es una foto actual; esta curva muestra altas en el período seleccionado.";

  switch (kpi) {
    case "avg_closure_time":
      return loadAvgClosureTimeTrends(from, to, sw);
    case "success_among_closed":
      return loadSuccessAmongClosedTrends(from, to, sw, mode);
    case "completion_vs_created":
      return loadCompletionVsCreatedTrends(from, to, sw, mode);
    case "created": {
      const rows = await prisma.transfer.findMany({
        where: { createdAt: { gte: from, lte: to }, ...sw },
        select: { createdAt: true },
      });
      const map = new Map<string, number>();
      for (const r of rows) {
        const k = bucketKey(mode, r.createdAt);
        map.set(k, (map.get(k) ?? 0) + 1);
      }
      const ordered = mergeAxis(orderedAxis(from, to, mode), map.keys());
      return singleLineResult(
        mode,
        ordered,
        map,
        { id: "v0", name: "Creados", color: PALETTE[0]! },
        "Traslados creados (fecha de alta)"
      );
    }
    case "finished": {
      const rows = await prisma.transfer.findMany({
        where: { status: "FINALIZADO", updatedAt: { gte: from, lte: to }, ...sw },
        select: { updatedAt: true },
      });
      const map = new Map<string, number>();
      for (const r of rows) {
        const k = bucketKey(mode, r.updatedAt);
        map.set(k, (map.get(k) ?? 0) + 1);
      }
      const ordered = mergeAxis(orderedAxis(from, to, mode), map.keys());
      return singleLineResult(
        mode,
        ordered,
        map,
        { id: "v0", name: "Finalizados", color: "#16a34a" },
        "Finalizados (fecha de cierre)"
      );
    }
    case "cancelled": {
      const rows = await prisma.transfer.findMany({
        where: { status: "CANCELADO", updatedAt: { gte: from, lte: to }, ...sw },
        select: { updatedAt: true },
      });
      const map = new Map<string, number>();
      for (const r of rows) {
        const k = bucketKey(mode, r.updatedAt);
        map.set(k, (map.get(k) ?? 0) + 1);
      }
      const ordered = mergeAxis(orderedAxis(from, to, mode), map.keys());
      return singleLineResult(
        mode,
        ordered,
        map,
        { id: "v0", name: "Cancelados", color: "#dc2626" },
        "Cancelados (fecha de cierre)"
      );
    }
    case "incidents": {
      const rows = await prisma.incident.findMany({
        where: {
          createdAt: { gte: from, lte: to },
          ...(scope ? { transfer: { scope: scope as "PLANTA" | "URGENCIAS" } } : {}),
        },
        select: { createdAt: true },
      });
      const map = new Map<string, number>();
      for (const r of rows) {
        const k = bucketKey(mode, r.createdAt);
        map.set(k, (map.get(k) ?? 0) + 1);
      }
      const ordered = mergeAxis(orderedAxis(from, to, mode), map.keys());
      return singleLineResult(
        mode,
        ordered,
        map,
        { id: "v0", name: "Incidencias", color: "#9333ea" },
        "Incidencias registradas (fecha de registro)"
      );
    }
    case "urgent_period": {
      const rows = await prisma.transfer.findMany({
        where: {
          createdAt: { gte: from, lte: to },
          priority:  "URGENTE",
          ...sw,
        },
        select: { createdAt: true },
      });
      const map = new Map<string, number>();
      for (const r of rows) {
        const k = bucketKey(mode, r.createdAt);
        map.set(k, (map.get(k) ?? 0) + 1);
      }
      const ordered = mergeAxis(orderedAxis(from, to, mode), map.keys());
      return singleLineResult(
        mode,
        ordered,
        map,
        { id: "v0", name: "Urgentes creados", color: "#dc2626" },
        "Prioridad urgente · fecha de alta"
      );
    }
    case "today_created":
    case "active_now":
    case "urgent_active": {
      const where: Prisma.TransferWhereInput =
        kpi === "urgent_active"
          ? { createdAt: { gte: from, lte: to }, priority: "URGENTE", ...sw }
          : { createdAt: { gte: from, lte: to }, ...sw };
      const rows = await prisma.transfer.findMany({
        where,
        select: { createdAt: true },
      });
      const map = new Map<string, number>();
      for (const r of rows) {
        const k = bucketKey(mode, r.createdAt);
        map.set(k, (map.get(k) ?? 0) + 1);
      }
      const ordered = mergeAxis(orderedAxis(from, to, mode), map.keys());
      const title =
        kpi === "today_created"
          ? "Creados en el período (fecha de alta)"
          : kpi === "urgent_active"
            ? "Urgentes · creados en el período (fecha de alta)"
            : "Creados en el período (referencia temporal)";
      const lineName =
        kpi === "urgent_active" ? "Urgentes creados" : "Traslados creados";
      return singleLineResult(
        mode,
        ordered,
        map,
        { id: "v0", name: lineName, color: PALETTE[0]! },
        title,
        kpi === "active_now" || kpi === "urgent_active" ? snapSubtitle : undefined
      );
    }
    default:
      return loadSummaryTrends(from, to, sw, scope, mode);
  }
}

async function loadBreakdownTrends(
  dim: ExploreDim,
  from: Date,
  to: Date,
  sw: Prisma.TransferWhereInput,
  mode: TrendGranularity
): Promise<ExploreTrendsResult> {
  const where = { createdAt: { gte: from, lte: to }, ...sw };
  let rows: { createdAt: Date; cat: string }[];

  switch (dim) {
    case "status": {
      const raw = await prisma.transfer.findMany({
        where,
        select: { createdAt: true, status: true },
      });
      rows = raw.map((r) => ({ createdAt: r.createdAt, cat: r.status }));
      break;
    }
    case "testType": {
      const raw = await prisma.transfer.findMany({
        where,
        select: { createdAt: true, testType: true },
      });
      rows = raw.map((r) => ({ createdAt: r.createdAt, cat: r.testType }));
      break;
    }
    case "priority": {
      const raw = await prisma.transfer.findMany({
        where,
        select: { createdAt: true, priority: true },
      });
      rows = raw.map((r) => ({ createdAt: r.createdAt, cat: r.priority }));
      break;
    }
    case "difficulty": {
      const raw = await prisma.transfer.findMany({
        where,
        select: { createdAt: true, difficulty: true },
      });
      rows = raw.map((r) => ({ createdAt: r.createdAt, cat: r.difficulty }));
      break;
    }
    case "scope": {
      const raw = await prisma.transfer.findMany({
        where,
        select: { createdAt: true, scope: true },
      });
      rows = raw.map((r) => ({ createdAt: r.createdAt, cat: r.scope }));
      break;
    }
  }

  const totals = new Map<string, number>();
  const perBucket = new Map<string, Map<string, number>>();

  for (const r of rows) {
    const cat = r.cat;
    totals.set(cat, (totals.get(cat) ?? 0) + 1);
    const bk = bucketKey(mode, r.createdAt);
    if (!perBucket.has(bk)) perBucket.set(bk, new Map());
    const m = perBucket.get(bk)!;
    m.set(cat, (m.get(cat) ?? 0) + 1);
  }

  const sortedCats = [...totals.entries()].sort((a, b) => b[1] - a[1]);
  const top = sortedCats.slice(0, TOP_BREAKDOWN).map(([k]) => k);
  const topSet = new Set(top);
  const hasOthers = sortedCats.some(([k]) => !topSet.has(k));

  const lines: TrendLineSpec[] = top.map((name, i) => ({
    id:    `s${i}`,
    name,
    color: PALETTE[i % PALETTE.length]!,
  }));
  if (hasOthers) {
    lines.push({
      id:    "s_other",
      name:  "Otros",
      color: "#94a3b8",
    });
  }

  let ordered = orderedAxis(from, to, mode);
  ordered = mergeAxis(ordered, perBucket.keys());

  const dimLabel: Record<ExploreDim, string> = {
    status:     "estado",
    testType:   "tipo de prueba",
    priority:   "prioridad",
    difficulty: "dificultad",
    scope:      "ámbito",
  };

  const points: TrendDatum[] = ordered.map((key) => {
    const bucket = perBucket.get(key);
    const values: Record<string, number | null> = {};
    for (let i = 0; i < top.length; i++) {
      values[`s${i}`] = bucket?.get(top[i]!) ?? 0;
    }
    if (hasOthers) {
      let o = 0;
      if (bucket) {
        for (const [cat, n] of bucket) {
          if (!topSet.has(cat)) o += n;
        }
      }
      values.s_other = o;
    }
    return { key, label: labelFor(mode, key), values };
  });

  return {
    granularity: mode,
    valueKind:   "count",
    metricTitle: `Traslados creados en el período, por ${dimLabel[dim]} (top ${TOP_BREAKDOWN}${hasOthers ? " + otros" : ""})`,
    lines,
    points,
  };
}

async function loadSliceTrends(
  dim: ExploreDim,
  val: string,
  from: Date,
  to: Date,
  sw: Prisma.TransferWhereInput,
  mode: TrendGranularity
): Promise<ExploreTrendsResult> {
  const base = { createdAt: { gte: from, lte: to }, ...sw };
  const field = dimToField(dim);
  const where: Prisma.TransferWhereInput = (() => {
    switch (field) {
      case "status":
        return { ...base, status: val as never };
      case "testType":
        return { ...base, testType: val as never };
      case "priority":
        return { ...base, priority: val as never };
      case "difficulty":
        return { ...base, difficulty: val as never };
      case "scope":
        return { ...base, scope: val as never };
    }
  })();

  const rows = await prisma.transfer.findMany({
    where,
    select: { createdAt: true },
  });
  const map = new Map<string, number>();
  for (const r of rows) {
    const k = bucketKey(mode, r.createdAt);
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  const ordered = mergeAxis(orderedAxis(from, to, mode), map.keys());
  return singleLineResult(
    mode,
    ordered,
    map,
    { id: "v0", name: "Traslados", color: PALETTE[0]! },
    `Creados en el período · ${dim} = ${val}`
  );
}

/**
 * Tendencias alineadas al tipo de vista del explorador (KPI, desglose o detalle).
 */
export async function loadExploreTrends(
  fromStr: string,
  toStr: string,
  scope: StatsScopeKey,
  ctx: ExploreTrendsContext
): Promise<ExploreTrendsResult> {
  const from = parseDateStartLocal(fromStr);
  const to   = parseDateEndLocal(toStr);
  const sw = scopeWhere(scope);
  const dailyUntil =
    ctx.view === "kpi" && ctx.kpi && ANALYTIC_KPIS_FOR_DAILY_BUCKETS.has(ctx.kpi)
      ? 120
      : 62;
  const mode = pickGranularity(from, to, dailyUntil);

  if (ctx.view === "kpi" && ctx.kpi) {
    return loadKpiTrends(ctx.kpi as ExploreKpi, from, to, sw, scope, mode);
  }
  if (ctx.view === "kpi" && !ctx.kpi) {
    return loadSummaryTrends(from, to, sw, scope, mode);
  }
  if (ctx.view === "breakdown" && isExploreDim(ctx.dim)) {
    return loadBreakdownTrends(ctx.dim, from, to, sw, mode);
  }
  if (ctx.view === "slice" && isExploreDim(ctx.dim) && ctx.val != null && ctx.val !== "") {
    return loadSliceTrends(ctx.dim, ctx.val, from, to, sw, mode);
  }
  if (isExploreDim(ctx.dim)) {
    return loadBreakdownTrends(ctx.dim, from, to, sw, mode);
  }
  return loadSummaryTrends(from, to, sw, scope, mode);
}
