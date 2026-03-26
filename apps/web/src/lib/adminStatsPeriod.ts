import type { Prisma } from "@prisma/client";

export type StatsPeriodKey = "7" | "30" | "90" | "all";
export type StatsScopeKey = "" | "PLANTA" | "URGENCIAS";

const MS_DAY = 86_400_000;

export function parseStatsPeriod(raw: string | undefined): StatsPeriodKey {
  if (raw === "7" || raw === "30" || raw === "90" || raw === "all") return raw;
  return "30";
}

export function parseStatsScope(raw: string | undefined): StatsScopeKey {
  if (raw === "PLANTA" || raw === "URGENCIAS") return raw;
  return "";
}

/** Inicio del período (UTC local del servidor) o null si es todo el historial */
export function periodStartDate(period: StatsPeriodKey, now = new Date()): Date | null {
  if (period === "all") return null;
  const days = period === "7" ? 7 : period === "90" ? 90 : 30;
  return new Date(now.getTime() - days * MS_DAY);
}

export function todayStart(now = new Date()): Date {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d;
}

const ACTIVE: Prisma.TransferWhereInput["status"] = {
  notIn: ["FINALIZADO", "CANCELADO"],
};

export function whereCreatedInPeriod(
  periodStart: Date | null,
  scope: StatsScopeKey
): Prisma.TransferWhereInput {
  const w: Prisma.TransferWhereInput = {};
  if (periodStart) w.createdAt = { gte: periodStart };
  if (scope) w.scope = scope as "PLANTA" | "URGENCIAS";
  return w;
}

export function whereScopeOnly(scope: StatsScopeKey): Prisma.TransferWhereInput {
  return scope ? { scope: scope as "PLANTA" | "URGENCIAS" } : {};
}

/** Traslados activos en este momento (instantánea), opcionalmente por ámbito */
export function whereActiveSnapshot(scope: StatsScopeKey): Prisma.TransferWhereInput {
  return { status: ACTIVE, ...whereScopeOnly(scope) };
}

/** Finalizados cuya fecha de cierre cae en el período */
export function whereFinalizedInPeriod(
  periodStart: Date | null,
  scope: StatsScopeKey
): Prisma.TransferWhereInput {
  const w: Prisma.TransferWhereInput = {
    status: "FINALIZADO",
    ...whereScopeOnly(scope),
  };
  if (periodStart) w.updatedAt = { gte: periodStart };
  return w;
}

/** Cancelados en el período (por updatedAt) */
export function whereCancelledInPeriod(
  periodStart: Date | null,
  scope: StatsScopeKey
): Prisma.TransferWhereInput {
  const w: Prisma.TransferWhereInput = {
    status: "CANCELADO",
    ...whereScopeOnly(scope),
  };
  if (periodStart) w.updatedAt = { gte: periodStart };
  return w;
}

export const PERIOD_LABEL: Record<StatsPeriodKey, string> = {
  "7":  "Últimos 7 días",
  "30": "Últimos 30 días",
  "90": "Últimos 90 días",
  all:  "Todo el historial",
};

export const SCOPE_LABEL: Record<StatsScopeKey, string> = {
  "":         "Todos los ámbitos",
  PLANTA:    "Planta",
  URGENCIAS: "Urgencias",
};
