import { prisma } from "@/lib/prisma";
import { DIFFICULTY_WEIGHT } from "@/lib/sla";
import Link from "next/link";
import {
  parseStatsPeriod,
  parseStatsScope,
  periodStartDate,
  todayStart,
  whereCreatedInPeriod,
  whereActiveSnapshot,
  whereFinalizedInPeriod,
  whereCancelledInPeriod,
  whereScopeOnly,
  type StatsPeriodKey,
  type StatsScopeKey,
} from "@/lib/adminStatsPeriod";
import {
  exploreUrl,
  periodScopeToExploreDefaults,
  type ExploreKpi,
} from "@/lib/statsExplore";
import { getShift } from "@/lib/shifts";
import {
  buildDailyShiftChartData,
  localDayKeyFromDate,
  type DailyFinishedTransferDetail,
  type DailyShiftRow,
} from "@/lib/statsDailyByShift";
import ChartsClient, { type ScopePriorityChartRow } from "./ChartsClient";
import DailyShiftChartClient from "./DailyShiftChartClient";
import StatsPeriodFilters from "./StatsPeriodFilters";

export const dynamic = "force-dynamic";

/* ================================================================
   CONSTANTES
================================================================ */
const STATUS_LABELS: Record<string, string> = {
  SOLICITADO: "Solicitado",
  ASIGNADO:   "Asignado",
  EN_CURSO:   "En curso",
  EN_PRUEBA:  "En prueba",
  FINALIZADO: "Finalizado",
  PAUSADO:    "Pausado",
  CANCELADO:  "Cancelado",
};

const STATUS_COLORS: Record<string, string> = {
  SOLICITADO: "bg-blue-500",
  ASIGNADO:   "bg-yellow-400",
  EN_CURSO:   "bg-green-500",
  EN_PRUEBA:  "bg-violet-500",
  FINALIZADO: "bg-gray-400",
  PAUSADO:    "bg-orange-400",
  CANCELADO:  "bg-red-400",
};

const TEST_LABELS: Record<string, string> = {
  RM:              "RM",
  ECO:             "Eco",
  RX:              "RX",
  MEDICINA_NUCLEAR: "Med. Nuclear",
  TC:              "TC",
};

const TABS = [
  { id: "global",   label: "Global"    },
  { id: "tecnico",  label: "Técnicos"  },
  { id: "celador",  label: "Celadores" },
] as const;
type Tab = (typeof TABS)[number]["id"];

function userDisplayName(u: {
  firstName: string | null;
  lastName1: string | null;
  email: string;
}): string {
  return [u.firstName, u.lastName1].filter(Boolean).join(" ") || u.email;
}

/* ================================================================
   PAGE
================================================================ */
export default async function StatsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>> | Record<string, string>;
}) {
  const sp   = await Promise.resolve(searchParams as any);
  const raw  = sp?.tab ?? "global";
  const tab: Tab = (TABS.some((t) => t.id === raw) ? raw : "global") as Tab;

  const periodKey = parseStatsPeriod(sp?.period);
  const scopeKey  = parseStatsScope(sp?.scope);
  const pStart    = periodStartDate(periodKey);
  const dayStart  = todayStart();

  const whereCreated = whereCreatedInPeriod(pStart, scopeKey);
  const whereActive  = whereActiveSnapshot(scopeKey);
  const whereFin     = whereFinalizedInPeriod(pStart, scopeKey);
  const whereCan     = whereCancelledInPeriod(pStart, scopeKey);

  const exploreDefaults = periodScopeToExploreDefaults(periodKey);
  const exploreCtx      = {
    from:  exploreDefaults.from,
    to:    exploreDefaults.to,
    scope: scopeKey,
  };

  const kpiHref = (kpi: ExploreKpi) =>
    exploreUrl({ view: "kpi", kpi, ...exploreCtx });

  /* ── PER-TAB FETCHING ── */

  /* ---- GLOBAL ---- */
  let global: GlobalData | null = null;
  if (tab === "global") {
    const [
      createdInPeriod,
      activeNow,
      urgentActive,
      createdToday,
      urgentInPeriod,
      byStatus,
      byTestType,
      byPriority,
      byDifficulty,
      byScope,
      scopePriorityBreakdown,
      finishedRows,
      cancelledInPeriod,
      incidentsInPeriod,
    ] = await Promise.all([
      prisma.transfer.count({ where: whereCreated }),
      prisma.transfer.count({ where: whereActive }),
      prisma.transfer.count({
        where: { ...whereActive, priority: "URGENTE" },
      }),
      prisma.transfer.count({
        where: { createdAt: { gte: dayStart }, ...whereScopeOnly(scopeKey) },
      }),
      prisma.transfer.count({
        where: { ...whereCreated, priority: "URGENTE" },
      }),
      prisma.transfer.groupBy({ by: ["status"],     where: whereCreated, _count: true }),
      prisma.transfer.groupBy({ by: ["testType"],   where: whereCreated, _count: true }),
      prisma.transfer.groupBy({ by: ["priority"],   where: whereCreated, _count: true }),
      prisma.transfer.groupBy({ by: ["difficulty"], where: whereCreated, _count: true }),
      prisma.transfer.groupBy({ by: ["scope"],      where: whereCreated, _count: true }),
      prisma.transfer.groupBy({
        by: ["scope", "priority"],
        where: whereCreated,
        _count: true,
      }),
      prisma.transfer.findMany({
        where: whereFin,
        select: {
          id: true,
          mrn: true,
          patientFullName: true,
          dob: true,
          location: true,
          testType: true,
          priority: true,
          difficulty: true,
          scope: true,
          createdAt: true,
          updatedAt: true,
          createdBy: {
            select: { firstName: true, lastName1: true, email: true },
          },
          assignedTo: {
            select: { firstName: true, lastName1: true, email: true },
          },
        },
      }),
      prisma.transfer.count({ where: whereCan }),
      prisma.incident.count({
        where: {
          ...(pStart ? { createdAt: { gte: pStart } } : {}),
          ...(scopeKey
            ? { transfer: { scope: scopeKey as "PLANTA" | "URGENCIAS" } }
            : {}),
        },
      }),
    ]);

    const avgTime =
      finishedRows.length > 0
        ? Math.round(
            finishedRows.reduce(
              (a, t) => a + (t.updatedAt.getTime() - t.createdAt.getTime()) / 60000,
              0
            ) / finishedRows.length
          )
        : 0;

    const closedInPeriod = finishedRows.length + cancelledInPeriod;
    const successAmongClosed =
      closedInPeriod > 0
        ? Math.round((finishedRows.length / closedInPeriod) * 100)
        : 0;

    const completionVsCreated =
      createdInPeriod > 0
        ? Math.round((finishedRows.length / createdInPeriod) * 100)
        : 0;

    const dailyShiftSeries: DailyShiftRow[] = buildDailyShiftChartData(
      finishedRows,
      pStart
    );

    const scopePriorityChart = buildScopePriorityChart(scopePriorityBreakdown, scopeKey);

    const finishedTransfersByDay: Record<string, DailyFinishedTransferDetail[]> = {};
    for (const t of finishedRows) {
      const dk = localDayKeyFromDate(t.updatedAt);
      if (!finishedTransfersByDay[dk]) finishedTransfersByDay[dk] = [];
      finishedTransfersByDay[dk].push({
        id: t.id,
        mrn: t.mrn,
        patientFullName: t.patientFullName,
        dob: t.dob.toISOString(),
        location: t.location,
        testType: t.testType,
        priority: t.priority,
        difficulty: t.difficulty,
        scope: t.scope,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
        closedShift: getShift(t.updatedAt),
        createdByLabel: userDisplayName(t.createdBy),
        assignedToLabel: t.assignedTo ? userDisplayName(t.assignedTo) : null,
      });
    }
    for (const k of Object.keys(finishedTransfersByDay)) {
      finishedTransfersByDay[k].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
    }

    global = {
      periodKey,
      scopeKey,
      createdInPeriod,
      activeNow,
      urgentActive,
      createdToday,
      urgentInPeriod,
      byStatus,
      byTestType,
      byPriority,
      byDifficulty,
      byScope,
      avgTime,
      finishedInPeriod: finishedRows.length,
      cancelledInPeriod,
      incidentsInPeriod,
      successAmongClosed,
      completionVsCreated,
      dailyShiftSeries,
      finishedTransfersByDay,
      scopePriorityChart,
    };
  }

  /* ---- TÉCNICOS ---- */
  let tecnico: TecnicoData | null = null;
  if (tab === "tecnico") {
    const users = await prisma.user.findMany({
      where: { role: "TECNICO" },
      include: {
        transfersCreated: {
          where: whereCreated,
          select: { id: true, priority: true, status: true, difficulty: true },
        },
      },
      orderBy: [{ active: "desc" }, { firstName: "asc" }],
    });

    const totalCreated  = users.reduce((a, u) => a + u.transfersCreated.length, 0);
    const totalUrgent   = users.reduce((a, u) => a + u.transfersCreated.filter((t) => t.priority === "URGENTE").length, 0);
    const totalActive   = users.reduce((a, u) => a + u.transfersCreated.filter((t) => !["FINALIZADO","CANCELADO"].includes(t.status)).length, 0);
    const activeTecs    = users.filter((u) => u.active).length;

    const ranking = users
      .map((u) => {
        const created   = u.transfersCreated.length;
        const urgent    = u.transfersCreated.filter((t) => t.priority === "URGENTE").length;
        const cancelled = u.transfersCreated.filter((t) => t.status === "CANCELADO").length;
        const active    = u.transfersCreated.filter((t) => !["FINALIZADO","CANCELADO"].includes(t.status)).length;
        const critico   = u.transfersCreated.filter((t) => t.difficulty === "CRITICO").length;
        const banal     = u.transfersCreated.filter((t) => t.difficulty === "BANAL").length;
        return {
          id:        u.id,
          name:      [u.firstName, u.lastName1].filter(Boolean).join(" ") || u.email,
          email:     u.email,
          userActive: u.active,
          created, urgent, cancelled, active, critico, banal,
          cancelRate: created > 0 ? Math.round((cancelled / created) * 100) : 0,
          urgentRate: created > 0 ? Math.round((urgent   / created) * 100) : 0,
        };
      })
      .sort((a, b) => b.created - a.created);

    tecnico = { ranking, totalCreated, totalUrgent, totalActive, activeTecs };
  }

  /* ---- CELADORES ---- */
  let celador: CeladorData | null = null;
  if (tab === "celador") {
    const users = await prisma.user.findMany({
      where: { role: "CELADOR" },
      include: {
        transfersAssigned: {
          where: whereCreated,
          select: { id: true, priority: true, status: true, difficulty: true, createdAt: true, updatedAt: true },
        },
      },
      orderBy: [{ active: "desc" }, { firstName: "asc" }],
    });

    const allFinished = users.flatMap((u) =>
      u.transfersAssigned.filter((t) => t.status === "FINALIZADO")
    );

    const totalFinished  = allFinished.length;
    const totalUrgent    = allFinished.filter((t) => t.priority === "URGENTE").length;
    const activeCeladors = users.filter((u) => u.active).length;

    const globalAvgTime =
      totalFinished > 0
        ? Math.round(
            allFinished.reduce(
              (a, t) => a + (t.updatedAt.getTime() - t.createdAt.getTime()) / 60000,
              0
            ) / totalFinished
          )
        : 0;

    const ranking = users
      .map((u) => {
        const done      = u.transfersAssigned.filter((t) => t.status === "FINALIZADO");
        const active    = u.transfersAssigned.filter((t) => !["FINALIZADO","CANCELADO"].includes(t.status)).length;
        const urgent    = done.filter((t) => t.priority === "URGENTE").length;
        const critico   = done.filter((t) => t.difficulty === "CRITICO").length;
        const todayDone = done.filter((t) => t.updatedAt >= dayStart).length;
        const avgTime =
          done.length > 0
            ? Math.round(
                done.reduce(
                  (a, t) => a + (t.updatedAt.getTime() - t.createdAt.getTime()) / 60000,
                  0
                ) / done.length
              )
            : 0;
        // Weighted load: BANAL=1, MODERADO=2, CRITICO=3
        const weightedLoad = done.reduce(
          (a, t) => a + (DIFFICULTY_WEIGHT[t.difficulty as string] ?? 2),
          0
        );
        return {
          id:         u.id,
          name:       [u.firstName, u.lastName1].filter(Boolean).join(" ") || u.email,
          email:      u.email,
          userActive: u.active,
          finished:   done.length,
          urgent, active, todayDone, avgTime, critico, weightedLoad,
        };
      })
      .sort((a, b) => b.finished - a.finished);

    celador = { ranking, totalFinished, totalUrgent, activeCeladors, globalAvgTime };
  }

  /* ================================================================
     RENDER
  ================================================================ */
  return (
    <main className="p-6 space-y-6">
      {/* HEADER */}
      <h1 className="text-2xl font-semibold text-gray-900">Estadísticas</h1>

      {/* TABS */}
      <nav className="flex border-b border-gray-200">
        {TABS.map((t) => {
          const q = new URLSearchParams();
          q.set("tab", t.id);
          q.set("period", periodKey);
          if (scopeKey) q.set("scope", scopeKey);
          return (
            <Link
              key={t.id}
              href={`/admin/stats?${q.toString()}`}
              className={`px-5 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                tab === t.id
                  ? "border-gray-900 text-gray-900"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>

      <StatsPeriodFilters period={periodKey} scope={scopeKey} activeTab={tab} />

      <p className="text-sm text-gray-600">
        <Link
          href={exploreUrl({ view: "breakdown", dim: "status", ...exploreCtx })}
          className="font-medium text-gray-900 underline underline-offset-2 hover:text-gray-600"
        >
          Abrir explorador avanzado
        </Link>
        {" · "}
        filtros por año/mes/día y comparación entre períodos.
      </p>

      {/* CONTENT */}
      {tab === "global"  && global  && (
        <GlobalTab data={global} explore={exploreCtx} kpiHref={kpiHref} />
      )}
      {tab === "tecnico" && tecnico && (
        <TecnicoTab data={tecnico} explore={exploreCtx} />
      )}
      {tab === "celador" && celador && (
        <CeladorTab data={celador} explore={exploreCtx} />
      )}
    </main>
  );
}

/* ================================================================
   TAB: GLOBAL
================================================================ */
const DIFFICULTY_LABELS: Record<string, string> = {
  BANAL:    "Banal",
  MODERADO: "Moderado",
  CRITICO:  "Crítico",
};
const DIFFICULTY_COLORS: Record<string, string> = {
  BANAL:    "bg-green-500",
  MODERADO: "bg-yellow-400",
  CRITICO:  "bg-red-500",
};

const SCOPE_CHART_LABELS: Record<string, string> = {
  PLANTA:    "Planta",
  URGENCIAS: "Urgencias",
};

/** Prisma `groupBy` con `_count: true` expone el total como número; con objeto es `_all`. */
function prismaGroupCount(r: { _count: number | { _all: number } }): number {
  const c = r._count;
  if (typeof c === "number") return c;
  if (c && typeof c === "object" && typeof c._all === "number") return c._all;
  return 0;
}

function buildScopePriorityChart(
  rows: { scope: string; priority: string; _count: number | { _all: number } }[],
  scopeKey: StatsScopeKey
): ScopePriorityChartRow[] {
  const agg = new Map<string, { NORMAL: number; URGENTE: number }>();
  for (const r of rows) {
    const n = prismaGroupCount(r);
    if (!agg.has(r.scope)) agg.set(r.scope, { NORMAL: 0, URGENTE: 0 });
    const a = agg.get(r.scope)!;
    if (r.priority === "URGENTE") a.URGENTE += n;
    else a.NORMAL += n;
  }
  const order = ["PLANTA", "URGENCIAS"] as const;
  const out: ScopePriorityChartRow[] = [];
  for (const sc of order) {
    if (scopeKey && sc !== scopeKey) continue;
    const v = agg.get(sc);
    if (!v || (v.NORMAL === 0 && v.URGENTE === 0)) continue;
    out.push({
      name: SCOPE_CHART_LABELS[sc] ?? sc,
      scopeRaw: sc,
      NORMAL: v.NORMAL,
      URGENTE: v.URGENTE,
    });
  }
  return out;
}

type GlobalData = {
  periodKey:            StatsPeriodKey;
  scopeKey:             StatsScopeKey;
  createdInPeriod:      number;
  activeNow:            number;
  urgentActive:         number;
  createdToday:         number;
  urgentInPeriod:       number;
  byStatus:             { status: string; _count: number }[];
  byTestType:           { testType: string; _count: number }[];
  byPriority:           { priority: string; _count: number }[];
  byDifficulty:         { difficulty: string; _count: number }[];
  byScope:              { scope: string; _count: number }[];
  avgTime:              number;
  finishedInPeriod:     number;
  cancelledInPeriod:    number;
  incidentsInPeriod:    number;
  successAmongClosed:   number;
  completionVsCreated:  number;
  dailyShiftSeries:     DailyShiftRow[];
  finishedTransfersByDay: Record<string, DailyFinishedTransferDetail[]>;
  scopePriorityChart:   ScopePriorityChartRow[];
};

function GlobalTab({
  data,
  explore,
  kpiHref,
}: {
  data: GlobalData;
  explore: { from: string; to: string; scope: StatsScopeKey };
  kpiHref: (k: ExploreKpi) => string;
}) {
  const slice = (dim: "status" | "testType" | "priority" | "difficulty" | "scope", val: string) =>
    exploreUrl({ view: "slice", dim, val, ...explore });

  const chartTestTypeData = data.byTestType.map((t) => ({
    name:   TEST_LABELS[t.testType] ?? t.testType,
    value:  t._count,
    rawVal: t.testType,
  }));
  const chartPriorityData = data.byPriority.map((p) => ({
    name:   p.priority === "URGENTE" ? "Urgente" : "Normal",
    value:  p._count,
    rawVal: p.priority,
  }));

  const maxStatus =
    data.byStatus.length > 0 ? Math.max(...data.byStatus.map((s) => s._count), 1) : 1;
  const maxDifficulty =
    data.byDifficulty.length > 0 ? Math.max(...data.byDifficulty.map((d) => d._count), 1) : 1;
  const totalDiff     = data.byDifficulty.reduce((a, d) => a + d._count, 0) || 1;
  const totalScope    = data.byScope.reduce((a, s) => a + s._count, 0) || 1;

  const diffOrder = ["BANAL", "MODERADO", "CRITICO"];
  const byDiffSorted = [...data.byDifficulty].sort(
    (a, b) => diffOrder.indexOf(a.difficulty) - diffOrder.indexOf(b.difficulty)
  );

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        <Kpi label="Creados (período)"     value={data.createdInPeriod} href={kpiHref("created")} />
        <Kpi label="Activos ahora"         value={data.activeNow}         href={kpiHref("active_now")} />
        <Kpi label="Urgentes activos"      value={data.urgentActive}      href={kpiHref("urgent_active")} />
        <Kpi label="Urgentes (en período)" value={data.urgentInPeriod}    href={kpiHref("urgent_period")} />
        <Kpi label="Creados hoy"           value={data.createdToday}     href={kpiHref("today_created")} />
        <Kpi label="Incidencias (período)" value={data.incidentsInPeriod} href={kpiHref("incidents")} />
        <Kpi label="Finalizados (período)" value={data.finishedInPeriod}  href={kpiHref("finished")} />
        <Kpi label="Cancelados (período)"  value={data.cancelledInPeriod} href={kpiHref("cancelled")} />
        <Kpi
          label="T. medio cierre"
          value={data.finishedInPeriod > 0 ? `${data.avgTime} min` : "—"}
          href={
            data.finishedInPeriod > 0
              ? kpiHref("avg_closure_time")
              : undefined
          }
        />
      </section>

      <DailyShiftChartClient
        data={data.dailyShiftSeries}
        finishedByDay={data.finishedTransfersByDay}
      />

      {/* Tasas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          href={exploreUrl({ view: "kpi", kpi: "success_among_closed", ...explore })}
          className="block border rounded-xl p-5 bg-white space-y-3 hover:ring-2 hover:ring-gray-200 transition-shadow"
        >
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-gray-700">
              Éxito entre cerrados en período
            </span>
            <span className="font-semibold text-gray-900">
              {data.finishedInPeriod + data.cancelledInPeriod > 0
                ? `${data.successAmongClosed}%`
                : "—"}
            </span>
          </div>
          <p className="text-xs text-gray-500">
            Finalizados / (finalizados + cancelados) según fecha de cierre. Clic para tendencia y resumen de cierres.
          </p>
          <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-green-500 transition-all"
              style={{ width: `${data.successAmongClosed}%` }}
            />
          </div>
        </Link>
        <Link
          href={exploreUrl({ view: "kpi", kpi: "completion_vs_created", ...explore })}
          className="block border rounded-xl p-5 bg-white space-y-3 hover:ring-2 hover:ring-gray-200 transition-shadow"
        >
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-gray-700">
              Finalizados / creados en período
            </span>
            <span className="font-semibold text-gray-900">
              {data.createdInPeriod > 0 ? `${data.completionVsCreated}%` : "—"}
            </span>
          </div>
          <p className="text-xs text-gray-500">
            Clic para tendencia por intervalo y comparar volumen creados vs finalizados.
          </p>
          <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-indigo-500 transition-all"
              style={{ width: `${data.completionVsCreated}%` }}
            />
          </div>
        </Link>
      </div>

      {/* DIFFICULTY + STATUS breakdown — 2 cols */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* DIFICULTAD */}
        <section className="border rounded-xl p-5 bg-white space-y-4">
          <Link
            href={exploreUrl({ view: "breakdown", dim: "difficulty", ...explore })}
            className="font-semibold text-gray-800 hover:underline inline-block"
          >
            Dificultad de traslados →
          </Link>

          {/* Barra horizontal proporcional */}
          <div className="flex h-5 rounded-full overflow-hidden gap-0.5">
            {byDiffSorted.map((d) => (
              <div
                key={d.difficulty}
                className={`${DIFFICULTY_COLORS[d.difficulty] ?? "bg-gray-300"} transition-all`}
                style={{ width: `${Math.round((d._count / totalDiff) * 100)}%` }}
                title={`${DIFFICULTY_LABELS[d.difficulty] ?? d.difficulty}: ${d._count}`}
              />
            ))}
          </div>

          <div className="space-y-2">
            {byDiffSorted.map((d) => (
              <Link
                key={d.difficulty}
                href={slice("difficulty", d.difficulty)}
                className="block space-y-0.5 rounded-lg hover:bg-gray-50 -mx-1 px-1 py-0.5"
              >
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full inline-block ${DIFFICULTY_COLORS[d.difficulty] ?? "bg-gray-300"}`} />
                    {DIFFICULTY_LABELS[d.difficulty] ?? d.difficulty}
                  </span>
                  <span className="font-medium text-gray-900">
                    {d._count}
                    <span className="text-gray-400 text-xs ml-1">
                      ({Math.round((d._count / totalDiff) * 100)}%)
                    </span>
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${DIFFICULTY_COLORS[d.difficulty] ?? "bg-gray-400"}`}
                    style={{ width: `${Math.round((d._count / maxDifficulty) * 100)}%` }}
                  />
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* ESTADO */}
        <section className="border rounded-xl p-5 bg-white space-y-3">
          <Link
            href={exploreUrl({ view: "breakdown", dim: "status", ...explore })}
            className="font-semibold text-gray-800 hover:underline inline-block"
          >
            Distribución por estado →
          </Link>
          <div className="space-y-2">
            {data.byStatus
              .sort((a, b) => b._count - a._count)
              .map((s) => (
                <Link
                  key={s.status}
                  href={slice("status", s.status)}
                  className="block space-y-0.5 rounded-lg hover:bg-gray-50 -mx-1 px-1 py-0.5"
                >
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">{STATUS_LABELS[s.status] ?? s.status}</span>
                    <span className="font-medium text-gray-900">{s._count}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${STATUS_COLORS[s.status] ?? "bg-gray-400"}`}
                      style={{ width: `${Math.round((s._count / maxStatus) * 100)}%` }}
                    />
                  </div>
                </Link>
              ))}
          </div>
        </section>
      </div>

      {/* Ámbito: solo tiene sentido comparar si no hay filtro único de ámbito */}
      {data.byScope.length > 0 && (
        <section className="border rounded-xl p-5 bg-white space-y-4">
          <h2 className="font-semibold text-gray-800">
            Creados en período por ámbito
            {data.scopeKey ? " (filtro activo)" : ""}
          </h2>
          <div className="flex h-5 rounded-full overflow-hidden gap-0.5 max-w-xl">
            {data.byScope.map((s) => (
              <div
                key={s.scope}
                className={`${s.scope === "URGENCIAS" ? "bg-rose-500" : "bg-sky-500"} transition-all`}
                style={{ width: `${Math.round((s._count / totalScope) * 100)}%` }}
                title={`${SCOPE_CHART_LABELS[s.scope] ?? s.scope}: ${s._count}`}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-4 text-sm">
            {data.byScope.map((s) => (
              <Link
                key={s.scope}
                href={slice("scope", s.scope)}
                className="text-gray-700 hover:text-gray-900 underline-offset-2 hover:underline"
              >
                <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${s.scope === "URGENCIAS" ? "bg-rose-500" : "bg-sky-500"}`} />
                {SCOPE_CHART_LABELS[s.scope] ?? s.scope}: <strong>{s._count}</strong> (
                {Math.round((s._count / totalScope) * 100)}%)
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* CHARTS (recharts) */}
      <ChartsClient
        scopePriorityChart={data.scopePriorityChart}
        byTestType={chartTestTypeData}
        byPriority={chartPriorityData}
        explore={explore}
        preFormatted
      />
    </div>
  );
}

/* ================================================================
   TAB: TÉCNICOS
================================================================ */
type TecnicoRanking = {
  id: string; name: string; email: string; userActive: boolean;
  created: number; urgent: number; cancelled: number; active: number;
  critico: number; banal: number;
  cancelRate: number; urgentRate: number;
};
type TecnicoData = {
  ranking:      TecnicoRanking[];
  totalCreated: number;
  totalUrgent:  number;
  totalActive:  number;
  activeTecs:   number;
};

function TecnicoTab({
  data,
  explore,
}: {
  data: TecnicoData;
  explore: { from: string; to: string; scope: StatsScopeKey };
}) {
  return (
    <div className="space-y-6">
      <p className="text-xs text-gray-500 border border-dashed border-gray-200 rounded-lg px-3 py-2 bg-gray-50">
        Las cifras y el ranking usan solo traslados <strong>creados</strong> en el período y ámbito
        seleccionados arriba.{" "}
        <Link
          href={exploreUrl({ view: "breakdown", dim: "testType", ...explore })}
          className="text-gray-800 font-medium underline"
        >
          Explorar por tipo de prueba
        </Link>
        {" · "}
        <Link
          href={exploreUrl({ view: "kpi", kpi: "created", ...explore })}
          className="text-gray-800 font-medium underline"
        >
          Listado de creados
        </Link>
      </p>
      {/* KPIs */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="Técnicos activos" value={data.activeTecs} />
        <Kpi
          label="Solicitudes"
          value={data.totalCreated}
          href={exploreUrl({ view: "kpi", kpi: "created", ...explore })}
        />
        <Kpi
          label="Urgentes"
          value={data.totalUrgent}
          href={exploreUrl({ view: "kpi", kpi: "urgent_period", ...explore })}
        />
        <Kpi
          label="En curso"
          value={data.totalActive}
          href={exploreUrl({ view: "kpi", kpi: "active_now", ...explore })}
        />
      </section>

      {/* RANKING */}
      <section className="border rounded-xl bg-white overflow-hidden">
        <div className="px-5 py-4 border-b">
          <h2 className="font-semibold text-gray-800">Ranking técnicos</h2>
        </div>

        {data.ranking.length === 0 ? (
          <p className="p-5 text-sm text-gray-400 italic">Sin datos aún</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-5 py-3 font-medium text-gray-600">Técnico</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Solicitudes</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">🔴 Crítico</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Urgentes</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">% Urg.</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Activos</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Cancelados</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.ranking.map((u, i) => (
                  <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <span className="w-6 text-center text-xs font-mono text-gray-400">
                          {i + 1}
                        </span>
                        <div>
                          <div className="font-medium text-gray-900">{u.name}</div>
                          <div className="text-xs text-gray-400">{u.email}</div>
                        </div>
                        {!u.userActive && (
                          <span className="text-xs bg-red-50 text-red-600 border border-red-100 rounded px-1.5 py-0.5">
                            Inactivo
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">{u.created}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-medium ${u.critico > 0 ? "text-red-600" : "text-gray-400"}`}>
                        {u.critico}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-orange-600 font-medium">{u.urgent}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-medium ${u.urgentRate >= 50 ? "text-red-600" : "text-gray-700"}`}>
                        {u.urgentRate}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-blue-600 font-medium">{u.active}</td>
                    <td className="px-4 py-3 text-right text-gray-500">{u.cancelled}</td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/stats/userStats/${u.id}`}
                        className="text-xs text-gray-500 hover:text-gray-900 underline"
                      >
                        Ver detalle →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

/* ================================================================
   TAB: CELADORES
================================================================ */
type CeladorRanking = {
  id: string; name: string; email: string; userActive: boolean;
  finished: number; urgent: number; active: number; todayDone: number; avgTime: number;
  critico: number; weightedLoad: number;
};
type CeladorData = {
  ranking:        CeladorRanking[];
  totalFinished:  number;
  totalUrgent:    number;
  activeCeladors: number;
  globalAvgTime:  number;
};

function CeladorTab({
  data,
  explore,
}: {
  data: CeladorData;
  explore: { from: string; to: string; scope: StatsScopeKey };
}) {
  return (
    <div className="space-y-6">
      <p className="text-xs text-gray-500 border border-dashed border-gray-200 rounded-lg px-3 py-2 bg-gray-50">
        El ranking usa traslados <strong>creados</strong> en el período y ámbito seleccionados (asignaciones
        ligadas a esas solicitudes).{" "}
        <Link
          href={exploreUrl({ view: "kpi", kpi: "finished", ...explore })}
          className="text-gray-800 font-medium underline"
        >
          Ver finalizados en explorador
        </Link>
        {" · "}
        <Link
          href={exploreUrl({ view: "breakdown", dim: "difficulty", ...explore })}
          className="text-gray-800 font-medium underline"
        >
          Por dificultad
        </Link>
      </p>
      {/* KPIs */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="Celadores activos" value={data.activeCeladors} />
        <Kpi
          label="Finalizados"
          value={data.totalFinished}
          href={exploreUrl({ view: "kpi", kpi: "finished", ...explore })}
        />
        <Kpi
          label="Urgentes"
          value={data.totalUrgent}
          href={exploreUrl({ view: "kpi", kpi: "urgent_period", ...explore })}
        />
        <Kpi
          label="T. medio global"
          value={`${data.globalAvgTime} min`}
          href={exploreUrl({ view: "kpi", kpi: "avg_closure_time", ...explore })}
        />
      </section>

      {/* RANKING */}
      <section className="border rounded-xl bg-white overflow-hidden">
        <div className="px-5 py-4 border-b">
          <h2 className="font-semibold text-gray-800">Ranking celadores</h2>
        </div>

        {data.ranking.length === 0 ? (
          <p className="p-5 text-sm text-gray-400 italic">Sin datos aún</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[560px]">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-5 py-3 font-medium text-gray-600">Celador</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Finalizados</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">🔴 Crítico</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Urgentes</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">T. medio</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600" title="Carga ponderada: Banal×1 + Moderado×2 + Crítico×3">Carga ★</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">En curso</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Hoy</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.ranking.map((u, i) => (
                  <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <span className="w-6 text-center text-xs font-mono text-gray-400">
                          {i + 1}
                        </span>
                        <div>
                          <div className="font-medium text-gray-900">{u.name}</div>
                          <div className="text-xs text-gray-400">{u.email}</div>
                        </div>
                        {!u.userActive && (
                          <span className="text-xs bg-red-50 text-red-600 border border-red-100 rounded px-1.5 py-0.5">
                            Inactivo
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">{u.finished}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-medium ${u.critico > 0 ? "text-red-600" : "text-gray-400"}`}>
                        {u.critico}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-orange-600 font-medium">{u.urgent}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-medium ${u.avgTime > 30 ? "text-red-600" : "text-green-600"}`}>
                        {u.avgTime > 0 ? `${u.avgTime} min` : "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-semibold text-purple-700">{u.weightedLoad}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-blue-600 font-medium">{u.active}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{u.todayDone}</td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/stats/userStats/${u.id}`}
                        className="text-xs text-gray-500 hover:text-gray-900 underline"
                      >
                        Ver detalle →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

/* ================================================================
   KPI COMPONENT
================================================================ */
function Kpi({
  label,
  value,
  href,
}: {
  label: string;
  value: string | number;
  href?: string;
}) {
  const inner = (
    <>
      <div className="text-xs text-gray-500 uppercase tracking-wide">{label}</div>
      <div className="text-2xl font-semibold text-gray-900">{value}</div>
      {href && (
        <div className="text-[10px] text-gray-400 pt-1">Clic para ampliar</div>
      )}
    </>
  );
  if (href) {
    return (
      <Link
        href={href}
        className="block border rounded-xl p-4 bg-white space-y-1 hover:ring-2 hover:ring-gray-300 transition-shadow cursor-pointer"
      >
        {inner}
      </Link>
    );
  }
  return <div className="border rounded-xl p-4 bg-white space-y-1">{inner}</div>;
}
