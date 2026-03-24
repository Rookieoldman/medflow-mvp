import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { StatusBadge } from "@/components/StatusBadge";
import { PriorityBadge } from "@/components/PriorityBadge";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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
  RM:               "RM",
  ECO:              "Eco",
  RX:               "RX",
  MEDICINA_NUCLEAR: "Med. Nuclear",
  TC:               "TC",
};

const ROLE_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  TECNICO:  { label: "Técnico",       bg: "bg-blue-100",  text: "text-blue-800"  },
  CELADOR:  { label: "Celador",       bg: "bg-green-100", text: "text-green-800" },
  ADMIN:    { label: "Administrador", bg: "bg-gray-100",  text: "text-gray-800"  },
};

function getInitials(first?: string | null, last?: string | null) {
  const f = first?.[0]?.toUpperCase() ?? "";
  const l = last?.[0]?.toUpperCase()  ?? "";
  return (f + l) || "?";
}

function formatDate(d: Date) {
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

function formatDateTime(d: Date) {
  return d.toLocaleString("es-ES", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

/* ================================================================
   PAGE
================================================================ */
export default async function UserStatsPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const resolved = await Promise.resolve(params as any);
  const userId   = resolved?.id as string | undefined;

  if (!userId) return <main className="p-6">Falta el id del usuario.</main>;

  /* ── USUARIO ── */
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return <main className="p-6">Usuario no encontrado.</main>;

  const fullName   = [user.firstName, user.lastName1, user.lastName2].filter(Boolean).join(" ");
  const displayName = fullName || user.email;
  const roleConfig = ROLE_CONFIG[user.role] ?? ROLE_CONFIG.ADMIN;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  /* ── TRASLADOS (ambos roles en paralelo) ── */
  const [createdTransfers, assignedTransfers] = await Promise.all([
    prisma.transfer.findMany({
      where: { createdById: userId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.transfer.findMany({
      where: { assignedToId: userId },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  /* ── KPIs TÉCNICO ── */
  const totalCreated  = createdTransfers.length;
  const urgentCreated = createdTransfers.filter((t) => t.priority === "URGENTE").length;
  const cancelledCreated = createdTransfers.filter((t) => t.status === "CANCELADO").length;
  const activeCreated = createdTransfers.filter(
    (t) => !["FINALIZADO", "CANCELADO"].includes(t.status)
  ).length;

  /* ── KPIs CELADOR ── */
  const finishedAssigned = assignedTransfers.filter((t) => t.status === "FINALIZADO");
  const totalFinished    = finishedAssigned.length;
  const urgentFinished   = finishedAssigned.filter((t) => t.priority === "URGENTE").length;
  const todayFinished    = finishedAssigned.filter((t) => t.updatedAt >= todayStart).length;
  const activeAssigned   = assignedTransfers.filter(
    (t) => !["FINALIZADO", "CANCELADO"].includes(t.status)
  ).length;

  const avgTime =
    totalFinished > 0
      ? Math.round(
          finishedAssigned.reduce(
            (a, t) => a + (t.updatedAt.getTime() - t.createdAt.getTime()) / 60000,
            0
          ) / totalFinished
        )
      : 0;

  /* ── STATUS BREAKDOWN ── */
  const primaryTransfers =
    user.role === "CELADOR" ? assignedTransfers : createdTransfers;

  const statusBreakdown = Object.entries(
    primaryTransfers.reduce<Record<string, number>>((acc, t) => {
      acc[t.status] = (acc[t.status] ?? 0) + 1;
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1]);

  const maxStatus = Math.max(...statusBreakdown.map(([, c]) => c), 1);

  /* ── TEST TYPE BREAKDOWN (celador) ── */
  const testBreakdown = user.role === "CELADOR"
    ? Object.entries(
        finishedAssigned.reduce<Record<string, number>>((acc, t) => {
          const k = t.testType as string;
          acc[k] = (acc[k] ?? 0) + 1;
          return acc;
        }, {})
      ).sort((a, b) => b[1] - a[1])
    : [];

  /* ── HISTORIAL RECIENTE (últimas 15 operaciones) ── */
  const historyTransfers = (
    user.role === "CELADOR"
      ? [...assignedTransfers].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      : [...createdTransfers].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  ).slice(0, 15);

  /* ── BACK URL ── */
  const backTab = user.role === "TECNICO" ? "tecnico" : user.role === "CELADOR" ? "celador" : "global";

  /* ================================================================
     RENDER
  ================================================================ */
  return (
    <main className="p-6 space-y-6 max-w-4xl">
      {/* BACK */}
      <Link
        href={`/admin/stats?tab=${backTab}`}
        className="text-sm text-gray-500 hover:text-gray-800 transition-colors"
      >
        ← Volver a estadísticas
      </Link>

      {/* ── CABECERA USUARIO ── */}
      <section className="border rounded-xl p-6 bg-white flex items-start gap-5 flex-wrap">
        {/* Avatar */}
        <div
          className={`w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold text-white flex-shrink-0 ${
            user.role === "TECNICO" ? "bg-blue-600"
            : user.role === "CELADOR" ? "bg-green-600"
            : "bg-gray-700"
          }`}
        >
          {getInitials(user.firstName, user.lastName1)}
        </div>

        <div className="flex-1 space-y-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-semibold text-gray-900">{displayName}</h1>
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${roleConfig.bg} ${roleConfig.text}`}
            >
              {roleConfig.label}
            </span>
            {!user.active && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-700">
                Inactivo
              </span>
            )}
          </div>

          <p className="text-sm text-gray-500">{user.email}</p>

          <div className="flex gap-4 text-xs text-gray-400 pt-1">
            <span>Alta: {formatDate(user.createdAt)}</span>
            <span>Última actividad: {formatDate(user.updatedAt)}</span>
          </div>
        </div>

        {/* Indicador activo */}
        <div className="flex items-center gap-1.5 text-sm font-medium">
          <span
            className={`w-2.5 h-2.5 rounded-full ${user.active ? "bg-green-500" : "bg-gray-300"}`}
          />
          {user.active ? "Activo" : "Inactivo"}
        </div>
      </section>

      {/* ── KPIs ── */}
      {user.role === "TECNICO" && (
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Kpi label="Solicitudes"   value={totalCreated}    />
          <Kpi label="Urgentes"      value={urgentCreated}   />
          <Kpi label="En curso"      value={activeCreated}   />
          <Kpi label="Cancelados"    value={cancelledCreated} />
        </section>
      )}

      {user.role === "CELADOR" && (
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Kpi label="Finalizados"  value={totalFinished}            />
          <Kpi label="Urgentes"     value={urgentFinished}           />
          <Kpi label="En curso"     value={activeAssigned}           />
          <Kpi label="T. medio"     value={`${avgTime} min`}         />
          <Kpi label="Hoy"          value={todayFinished} wide       />
        </section>
      )}

      {/* ── DISTRIBUCIÓN POR ESTADO ── */}
      {statusBreakdown.length > 0 && (
        <section className="border rounded-xl p-5 bg-white space-y-4">
          <h2 className="font-semibold text-gray-800">Distribución por estado</h2>
          <div className="space-y-2">
            {statusBreakdown.map(([status, count]) => (
              <div key={status} className="space-y-0.5">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{STATUS_LABELS[status] ?? status}</span>
                  <span className="font-medium text-gray-900">
                    {count}
                    <span className="text-gray-400 text-xs ml-1">
                      ({Math.round((count / primaryTransfers.length) * 100)}%)
                    </span>
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${STATUS_COLORS[status] ?? "bg-gray-400"}`}
                    style={{ width: `${Math.round((count / maxStatus) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── DISTRIBUCIÓN POR TIPO (solo celador) ── */}
      {user.role === "CELADOR" && testBreakdown.length > 0 && (
        <section className="border rounded-xl p-5 bg-white space-y-4">
          <h2 className="font-semibold text-gray-800">Traslados finalizados por tipo de prueba</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {testBreakdown.map(([type, count]) => (
              <div key={type} className="border rounded-lg p-3 text-center">
                <div className="text-lg font-semibold text-gray-900">{count}</div>
                <div className="text-xs text-gray-500 mt-0.5">{TEST_LABELS[type] ?? type}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── HISTORIAL RECIENTE ── */}
      <section className="border rounded-xl bg-white overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">
            {user.role === "CELADOR" ? "Últimos traslados realizados" : "Últimas solicitudes"}
          </h2>
          <span className="text-xs text-gray-400">
            Mostrando {historyTransfers.length} de {primaryTransfers.length}
          </span>
        </div>

        {historyTransfers.length === 0 ? (
          <p className="p-5 text-sm text-gray-400 italic">Sin actividad registrada.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-5 py-3 font-medium text-gray-600">Nº Historia</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-600">Paciente</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Estado</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Prioridad</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Tipo</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">
                    {user.role === "CELADOR" ? "Actualizado" : "Creado"}
                  </th>
                  {user.role === "CELADOR" && (
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Duración</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {historyTransfers.map((t) => {
                  const durationMin = Math.round(
                    (t.updatedAt.getTime() - t.createdAt.getTime()) / 60000
                  );
                  return (
                    <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 font-mono text-xs text-gray-500">{t.mrn}</td>
                      <td className="px-5 py-3 font-medium text-gray-900 truncate max-w-[160px]">
                        {t.patientFullName}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={t.status} />
                      </td>
                      <td className="px-4 py-3">
                        <PriorityBadge priority={t.priority} />
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{TEST_LABELS[t.testType] ?? t.testType}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {formatDateTime(user.role === "CELADOR" ? t.updatedAt : t.createdAt)}
                      </td>
                      {user.role === "CELADOR" && (
                        <td className="px-4 py-3 text-right text-xs text-gray-500">
                          {t.status === "FINALIZADO" ? `${durationMin} min` : "—"}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── LINKS RÁPIDOS ── */}
      <div className="flex gap-3 flex-wrap text-sm">
        <Link
          href={`/admin/users/${user.id}`}
          className="border rounded-lg px-4 py-2 text-gray-600 hover:bg-gray-50 transition-colors"
        >
          Editar usuario →
        </Link>
        <Link
          href={`/admin/stats?tab=${backTab}`}
          className="border rounded-lg px-4 py-2 text-gray-600 hover:bg-gray-50 transition-colors"
        >
          ← Volver al ranking
        </Link>
      </div>
    </main>
  );
}

/* ================================================================
   KPI COMPONENT
================================================================ */
function Kpi({
  label,
  value,
  wide,
}: {
  label: string;
  value: string | number;
  wide?: boolean;
}) {
  return (
    <div className={`border rounded-xl p-4 bg-white space-y-1 ${wide ? "col-span-2" : ""}`}>
      <div className="text-xs text-gray-500 uppercase tracking-wide">{label}</div>
      <div className="text-2xl font-semibold text-gray-900">{value}</div>
    </div>
  );
}
