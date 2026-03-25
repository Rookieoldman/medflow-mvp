import { prisma } from "@/lib/prisma";
import { DIFFICULTY_WEIGHT } from "@/lib/sla";
import Link from "next/link";
import ChartsClient from "./ChartsClient";

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

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  /* ── PER-TAB FETCHING ── */

  /* ---- GLOBAL ---- */
  let global: GlobalData | null = null;
  if (tab === "global") {
    const [
      total,
      urgent,
      today,
      byStatus,
      byTestType,
      byPriority,
      byDifficulty,
      finished,
      cancelledCount,
    ] = await Promise.all([
      prisma.transfer.count(),
      prisma.transfer.count({ where: { priority: "URGENTE" } }),
      prisma.transfer.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.transfer.groupBy({ by: ["status"],     _count: true }),
      prisma.transfer.groupBy({ by: ["testType"],   _count: true }),
      prisma.transfer.groupBy({ by: ["priority"],   _count: true }),
      prisma.transfer.groupBy({ by: ["difficulty"], _count: true }),
      prisma.transfer.findMany({
        where: { status: "FINALIZADO" },
        select: { createdAt: true, updatedAt: true },
      }),
      prisma.transfer.count({ where: { status: "CANCELADO" } }),
    ]);

    const avgTime =
      finished.length > 0
        ? Math.round(
            finished.reduce(
              (a, t) => a + (t.updatedAt.getTime() - t.createdAt.getTime()) / 60000,
              0
            ) / finished.length
          )
        : 0;

    const active = total - finished.length - cancelledCount;
    const completionRate = total > 0 ? Math.round((finished.length / total) * 100) : 0;

    global = {
      total, urgent, today, byStatus, byTestType, byPriority, byDifficulty,
      avgTime, active, finishedCount: finished.length, cancelledCount, completionRate,
    };
  }

  /* ---- TÉCNICOS ---- */
  let tecnico: TecnicoData | null = null;
  if (tab === "tecnico") {
    const users = await prisma.user.findMany({
      where: { role: "TECNICO" },
      include: {
        transfersCreated: {
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
        const todayDone = done.filter((t) => t.updatedAt >= todayStart).length;
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
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={`/admin/stats?tab=${t.id}`}
            className={`px-5 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === t.id
                ? "border-gray-900 text-gray-900"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {/* CONTENT */}
      {tab === "global"  && global  && <GlobalTab  data={global}  />}
      {tab === "tecnico" && tecnico && <TecnicoTab data={tecnico} />}
      {tab === "celador" && celador && <CeladorTab data={celador} />}
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

type GlobalData = {
  total:          number;
  urgent:         number;
  today:          number;
  byStatus:       { status: string; _count: number }[];
  byTestType:     { testType: string; _count: number }[];
  byPriority:     { priority: string; _count: number }[];
  byDifficulty:   { difficulty: string; _count: number }[];
  avgTime:        number;
  active:         number;
  finishedCount:  number;
  cancelledCount: number;
  completionRate: number;
};

function GlobalTab({ data }: { data: GlobalData }) {
  const chartStatusData   = data.byStatus.map((s) => ({ name: STATUS_LABELS[s.status]   ?? s.status,   value: s._count }));
  const chartTestTypeData = data.byTestType.map((t) => ({ name: TEST_LABELS[t.testType] ?? t.testType, value: t._count }));
  const chartPriorityData = data.byPriority.map((p) => ({ name: p.priority === "URGENTE" ? "Urgente" : "Normal", value: p._count }));

  const maxStatus     = Math.max(...data.byStatus.map((s) => s._count), 1);
  const maxDifficulty = Math.max(...data.byDifficulty.map((d) => d._count), 1);
  const totalDiff     = data.byDifficulty.reduce((a, d) => a + d._count, 0) || 1;

  const diffOrder = ["BANAL", "MODERADO", "CRITICO"];
  const byDiffSorted = [...data.byDifficulty].sort(
    (a, b) => diffOrder.indexOf(a.difficulty) - diffOrder.indexOf(b.difficulty)
  );

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <section className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <Kpi label="Total"       value={data.total}             />
        <Kpi label="Activos"     value={data.active}            />
        <Kpi label="Finalizados" value={data.finishedCount}     />
        <Kpi label="Cancelados"  value={data.cancelledCount}    />
        <Kpi label="Urgentes"    value={data.urgent}            />
        <Kpi label="Hoy"         value={data.today}             />
        <Kpi label="T. medio"    value={`${data.avgTime} min`}  />
      </section>

      {/* COMPLETION RATE */}
      <section className="border rounded-xl p-5 bg-white space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-gray-700">Tasa de finalización</span>
          <span className="font-semibold text-gray-900">{data.completionRate}%</span>
        </div>
        <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-green-500 transition-all"
            style={{ width: `${data.completionRate}%` }}
          />
        </div>
      </section>

      {/* DIFFICULTY + STATUS breakdown — 2 cols */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* DIFICULTAD */}
        <section className="border rounded-xl p-5 bg-white space-y-4">
          <h2 className="font-semibold text-gray-800">Dificultad de traslados</h2>

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
              <div key={d.difficulty} className="space-y-0.5">
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
              </div>
            ))}
          </div>
        </section>

        {/* ESTADO */}
        <section className="border rounded-xl p-5 bg-white space-y-3">
          <h2 className="font-semibold text-gray-800">Distribución por estado</h2>
          <div className="space-y-2">
            {data.byStatus
              .sort((a, b) => b._count - a._count)
              .map((s) => (
                <div key={s.status} className="space-y-0.5">
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
                </div>
              ))}
          </div>
        </section>
      </div>

      {/* CHARTS (recharts) */}
      <ChartsClient
        byStatus={chartStatusData}
        byTestType={chartTestTypeData}
        byPriority={chartPriorityData}
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

function TecnicoTab({ data }: { data: TecnicoData }) {
  return (
    <div className="space-y-6">
      {/* KPIs */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="Técnicos activos" value={data.activeTecs}   />
        <Kpi label="Solicitudes"      value={data.totalCreated} />
        <Kpi label="Urgentes"         value={data.totalUrgent}  />
        <Kpi label="En curso"         value={data.totalActive}  />
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

function CeladorTab({ data }: { data: CeladorData }) {
  return (
    <div className="space-y-6">
      {/* KPIs */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="Celadores activos" value={data.activeCeladors}         />
        <Kpi label="Finalizados"       value={data.totalFinished}          />
        <Kpi label="Urgentes"          value={data.totalUrgent}            />
        <Kpi label="T. medio global"   value={`${data.globalAvgTime} min`} />
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
function Kpi({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="border rounded-xl p-4 bg-white space-y-1">
      <div className="text-xs text-gray-500 uppercase tracking-wide">{label}</div>
      <div className="text-2xl font-semibold text-gray-900">{value}</div>
    </div>
  );
}
