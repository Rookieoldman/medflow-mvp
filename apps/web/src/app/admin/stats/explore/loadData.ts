import { prisma } from "@/lib/prisma";
import type { StatsScopeKey } from "@/lib/adminStatsPeriod";
import { todayStart } from "@/lib/adminStatsPeriod";
import {
  parseDateStartLocal,
  parseDateEndLocal,
  type ExploreDim,
  type ExploreKpi,
} from "@/lib/statsExplore";
import type { Prisma } from "@prisma/client";

const LIST_TAKE = 400;

function scopeWhere(scope: StatsScopeKey): Prisma.TransferWhereInput {
  return scope ? { scope: scope as "PLANTA" | "URGENCIAS" } : {};
}

const ACTIVE: Prisma.TransferWhereInput = {
  status: { notIn: ["FINALIZADO", "CANCELADO"] },
};

export type TransferListRow = {
  id:              string;
  mrn:             string;
  patientFullName: string;
  status:          string;
  priority:        string;
  difficulty:      string;
  testType:        string;
  scope:           string;
  location:        string;
  createdAt:       string;
  updatedAt:       string;
};

export type BreakdownRow = { key: string; label: string; count: number };

export type ExploreBlock =
  | { kind: "list"; title: string; rows: TransferListRow[]; total: number }
  | { kind: "breakdown"; title: string; rows: BreakdownRow[] }
  | { kind: "incidents"; title: string; rows: IncidentRow[]; total: number };

export type IncidentRow = {
  id:        string;
  type:      string;
  createdAt: string;
  note:      string | null;
  transferId: string;
  mrn:       string;
};

function transferSelect() {
  return {
    id: true,
    mrn: true,
    patientFullName: true,
    status: true,
    priority: true,
    difficulty: true,
    testType: true,
    scope: true,
    location: true,
    createdAt: true,
    updatedAt: true,
  } as const;
}

function mapTransfer(t: {
  id: string;
  mrn: string;
  patientFullName: string;
  status: string;
  priority: string;
  difficulty: string;
  testType: string;
  scope: string;
  location: string;
  createdAt: Date;
  updatedAt: Date;
}): TransferListRow {
  return {
    ...t,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}

async function loadKpi(
  kpi: ExploreKpi,
  from: Date,
  to: Date,
  scope: StatsScopeKey
): Promise<ExploreBlock> {
  const sw = scopeWhere(scope);

  switch (kpi) {
    case "active_now": {
      const rows = await prisma.transfer.findMany({
        where: { ...ACTIVE, ...sw },
        orderBy: { createdAt: "desc" },
        take:    LIST_TAKE,
        select:  transferSelect(),
      });
      return {
        kind:  "list",
        title: "Traslados activos ahora",
        rows:  rows.map(mapTransfer),
        total: rows.length,
      };
    }
    case "urgent_active": {
      const rows = await prisma.transfer.findMany({
        where: { ...ACTIVE, priority: "URGENTE", ...sw },
        orderBy: { createdAt: "desc" },
        take:    LIST_TAKE,
        select:  transferSelect(),
      });
      return {
        kind:  "list",
        title: "Urgentes activos ahora",
        rows:  rows.map(mapTransfer),
        total: rows.length,
      };
    }
    case "today_created": {
      const day = todayStart();
      const rows = await prisma.transfer.findMany({
        where: { createdAt: { gte: day }, ...sw },
        orderBy: { createdAt: "desc" },
        take:    LIST_TAKE,
        select:  transferSelect(),
      });
      return {
        kind:  "list",
        title: "Creados hoy (calendario)",
        rows:  rows.map(mapTransfer),
        total: rows.length,
      };
    }
    case "created": {
      const rows = await prisma.transfer.findMany({
        where: {
          createdAt: { gte: from, lte: to },
          ...sw,
        },
        orderBy: { createdAt: "desc" },
        take:    LIST_TAKE,
        select:  transferSelect(),
      });
      const total = await prisma.transfer.count({
        where: { createdAt: { gte: from, lte: to }, ...sw },
      });
      return {
        kind:  "list",
        title: "Traslados creados en el período",
        rows:  rows.map(mapTransfer),
        total,
      };
    }
    case "urgent_period": {
      const rows = await prisma.transfer.findMany({
        where: {
          createdAt: { gte: from, lte: to },
          priority:  "URGENTE",
          ...sw,
        },
        orderBy: { createdAt: "desc" },
        take:    LIST_TAKE,
        select:  transferSelect(),
      });
      const total = await prisma.transfer.count({
        where: {
          createdAt: { gte: from, lte: to },
          priority:  "URGENTE",
          ...sw,
        },
      });
      return {
        kind:  "list",
        title: "Urgentes creados en el período",
        rows:  rows.map(mapTransfer),
        total,
      };
    }
    case "finished":
    case "avg_closure_time": {
      const rows = await prisma.transfer.findMany({
        where: {
          status:    "FINALIZADO",
          updatedAt: { gte: from, lte: to },
          ...sw,
        },
        orderBy: { updatedAt: "desc" },
        take:    LIST_TAKE,
        select:  transferSelect(),
      });
      const total = await prisma.transfer.count({
        where: {
          status:    "FINALIZADO",
          updatedAt: { gte: from, lte: to },
          ...sw,
        },
      });
      return {
        kind:  "list",
        title:
          kpi === "avg_closure_time"
            ? "Finalizados en el período (referencia para tiempo medio)"
            : "Finalizados en el período (por fecha de cierre)",
        rows:  rows.map(mapTransfer),
        total,
      };
    }
    case "success_among_closed": {
      const fin = await prisma.transfer.count({
        where: { status: "FINALIZADO", updatedAt: { gte: from, lte: to }, ...sw },
      });
      const can = await prisma.transfer.count({
        where: { status: "CANCELADO", updatedAt: { gte: from, lte: to }, ...sw },
      });
      return {
        kind:  "breakdown",
        title: "Cierres en el período",
        rows:  [
          { key: "FIN", label: "Finalizados (fecha de cierre)", count: fin },
          { key: "CAN", label: "Cancelados (fecha de cierre)", count: can },
        ],
      };
    }
    case "completion_vs_created": {
      const cre = await prisma.transfer.count({
        where: { createdAt: { gte: from, lte: to }, ...sw },
      });
      const fin = await prisma.transfer.count({
        where: { status: "FINALIZADO", updatedAt: { gte: from, lte: to }, ...sw },
      });
      return {
        kind:  "breakdown",
        title: "Creados vs finalizados (cierre en período)",
        rows:  [
          { key: "CRE", label: "Creados en período", count: cre },
          { key: "FIN", label: "Finalizados (cierre en período)", count: fin },
        ],
      };
    }
    case "cancelled": {
      const rows = await prisma.transfer.findMany({
        where: {
          status:    "CANCELADO",
          updatedAt: { gte: from, lte: to },
          ...sw,
        },
        orderBy: { updatedAt: "desc" },
        take:    LIST_TAKE,
        select:  transferSelect(),
      });
      const total = await prisma.transfer.count({
        where: {
          status:    "CANCELADO",
          updatedAt: { gte: from, lte: to },
          ...sw,
        },
      });
      return {
        kind:  "list",
        title: "Cancelados en el período (por fecha de cierre)",
        rows:  rows.map(mapTransfer),
        total,
      };
    }
    case "incidents": {
      const where: Prisma.IncidentWhereInput = {
        createdAt: { gte: from, lte: to },
        ...(scope
          ? { transfer: { scope: scope as "PLANTA" | "URGENCIAS" } }
          : {}),
      };
      const raw = await prisma.incident.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take:    LIST_TAKE,
        select: {
          id:        true,
          type:      true,
          note:      true,
          createdAt: true,
          transferId: true,
          transfer:  { select: { mrn: true } },
        },
      });
      const total = await prisma.incident.count({ where });
      return {
        kind: "incidents",
        title: "Incidencias registradas en el período",
        rows: raw.map((i) => ({
          id:         i.id,
          type:       i.type,
          note:       i.note,
          createdAt:  i.createdAt.toISOString(),
          transferId: i.transferId,
          mrn:        i.transfer.mrn,
        })),
        total,
      };
    }
  }
}

async function loadBreakdown(
  dim: ExploreDim,
  from: Date,
  to: Date,
  scope: StatsScopeKey
): Promise<ExploreBlock> {
  const sw = scopeWhere(scope);
  const baseWhere: Prisma.TransferWhereInput = {
    createdAt: { gte: from, lte: to },
    ...sw,
  };

  const field =
    dim === "status"
      ? "status"
      : dim === "testType"
        ? "testType"
        : dim === "priority"
          ? "priority"
          : dim === "difficulty"
            ? "difficulty"
            : "scope";

  const grouped = await prisma.transfer.groupBy({
    by:      [field as "status" | "testType" | "priority" | "difficulty" | "scope"],
    where:   baseWhere,
    _count:  true,
  });

  const rows: BreakdownRow[] = grouped.map((g) => {
    const key = String((g as Record<string, unknown>)[field]);
    return { key, label: key, count: g._count };
  });
  rows.sort((a, b) => b.count - a.count);

  const titles: Record<ExploreDim, string> = {
    status:     "Por estado (creados en período)",
    testType:   "Por tipo de prueba",
    priority:   "Por prioridad",
    difficulty: "Por dificultad",
    scope:      "Por ámbito",
  };

  return { kind: "breakdown", title: titles[dim], rows };
}

async function loadSlice(
  dim: ExploreDim,
  val: string,
  from: Date,
  to: Date,
  scope: StatsScopeKey
): Promise<ExploreBlock> {
  const sw = scopeWhere(scope);
  const field =
    dim === "status"
      ? "status"
      : dim === "testType"
        ? "testType"
        : dim === "priority"
          ? "priority"
          : dim === "difficulty"
            ? "difficulty"
            : "scope";

  const where: Prisma.TransferWhereInput = {
    createdAt: { gte: from, lte: to },
    ...sw,
    [field]: val as never,
  };

  const rows = await prisma.transfer.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take:    LIST_TAKE,
    select:  transferSelect(),
  });
  const total = await prisma.transfer.count({ where });

  return {
    kind:  "list",
    title: `Detalle: ${dim} = ${val}`,
    rows:  rows.map(mapTransfer),
    total,
  };
}

export async function loadExploreBlock(
  view: string,
  kpi: string | undefined,
  dim: string | undefined,
  val: string | undefined,
  fromStr: string,
  toStr: string,
  scope: StatsScopeKey
): Promise<ExploreBlock | null> {
  const from = parseDateStartLocal(fromStr);
  const to   = parseDateEndLocal(toStr);

  if (view === "kpi" && kpi) {
    return loadKpi(kpi as ExploreKpi, from, to, scope);
  }
  if (view === "breakdown" && dim && isDim(dim)) {
    return loadBreakdown(dim, from, to, scope);
  }
  if (view === "slice" && dim && val && isDim(dim)) {
    return loadSlice(dim, val, from, to, scope);
  }
  return null;
}

function isDim(s: string): s is ExploreDim {
  return (
    s === "status" ||
    s === "testType" ||
    s === "priority" ||
    s === "difficulty" ||
    s === "scope"
  );
}
