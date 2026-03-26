import type { StatsPeriodKey, StatsScopeKey } from "@/lib/adminStatsPeriod";

const MS_DAY = 86_400_000;

export type ExploreView = "kpi" | "breakdown" | "slice";

/** KPIs que se pueden abrir desde el panel */
export type ExploreKpi =
  | "created"
  | "active_now"
  | "urgent_active"
  | "urgent_period"
  | "today_created"
  | "finished"
  | "cancelled"
  | "incidents"
  /** Tiempo medio alta→cierre por bucket (tendencia) */
  | "avg_closure_time"
  /** % finalizados entre cierres (por bucket) */
  | "success_among_closed"
  /** % finalizados del día / creados del día (por bucket) */
  | "completion_vs_created";

export type ExploreDim = "status" | "testType" | "priority" | "difficulty" | "scope";

export function formatDateOnlyLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Rango por defecto al enlazar desde estadísticas (período predefinido del listado). */
export function periodScopeToExploreDefaults(
  periodKey: StatsPeriodKey,
  now = new Date()
): { from: string; to: string } {
  const to = new Date(now);
  to.setHours(23, 59, 59, 999);
  const toStr = formatDateOnlyLocal(to);
  if (periodKey === "all") {
    return { from: "2020-01-01", to: toStr };
  }
  const days = periodKey === "7" ? 7 : periodKey === "90" ? 90 : 30;
  const from = new Date(now.getTime() - days * MS_DAY);
  from.setHours(0, 0, 0, 0);
  return { from: formatDateOnlyLocal(from), to: toStr };
}

export function parseDateStartLocal(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

export function parseDateEndLocal(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d, 23, 59, 59, 999);
}

/** Año completo / mes completo / día concreto → { from, to } en hora local */
export function rangeFromYMD(
  year: number,
  month: number | 0,
  day: number | 0
): { from: Date; to: Date } {
  if (!month || month < 1) {
    const from = new Date(year, 0, 1, 0, 0, 0, 0);
    const to   = new Date(year, 11, 31, 23, 59, 59, 999);
    return { from, to };
  }
  if (!day || day < 1) {
    const from = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const to   = new Date(year, month, 0, 23, 59, 59, 999);
    return { from, to };
  }
  const from = new Date(year, month - 1, day, 0, 0, 0, 0);
  const to   = new Date(year, month - 1, day, 23, 59, 59, 999);
  return { from, to };
}

export function exploreUrl(opts: {
  view: ExploreView;
  kpi?: ExploreKpi;
  dim?: ExploreDim;
  val?: string;
  from: string;
  to: string;
  scope: StatsScopeKey;
  cFrom?: string;
  cTo?: string;
}): string {
  const q = new URLSearchParams();
  q.set("view", opts.view);
  q.set("from", opts.from);
  q.set("to", opts.to);
  if (opts.scope) q.set("scope", opts.scope);
  if (opts.kpi) q.set("kpi", opts.kpi);
  if (opts.dim) q.set("dim", opts.dim);
  if (opts.val != null && opts.val !== "") q.set("val", opts.val);
  if (opts.cFrom) q.set("cFrom", opts.cFrom);
  if (opts.cTo)   q.set("cTo", opts.cTo);
  return `/admin/stats/explore?${q.toString()}`;
}

export function isExploreDim(s: string | undefined): s is ExploreDim {
  return (
    s === "status" ||
    s === "testType" ||
    s === "priority" ||
    s === "difficulty" ||
    s === "scope"
  );
}

export function isExploreKpi(s: string | undefined): s is ExploreKpi {
  return (
    s === "created" ||
    s === "active_now" ||
    s === "urgent_active" ||
    s === "urgent_period" ||
    s === "today_created" ||
    s === "finished" ||
    s === "cancelled" ||
    s === "incidents" ||
    s === "avg_closure_time" ||
    s === "success_among_closed" ||
    s === "completion_vs_created"
  );
}
