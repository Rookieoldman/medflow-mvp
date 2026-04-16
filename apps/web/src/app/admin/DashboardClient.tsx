"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { getSLABadge } from "@/lib/sla";

type Transfer = {
  id:              string;
  patientFullName: string;
  location:        string;
  status:          string;
  priority:        string;
  difficulty:      string;
  createdAt:       string;
};

type StatusEntry = { status: string; count: number };

const SHIFT_LABEL: Record<string, string> = {
  MANANA: "☀️ Mañana (08–15h)",
  TARDE:  "🌆 Tarde  (15–22h)",
  NOCHE:  "🌙 Noche  (22–08h)",
};

function getShiftFromTime(now: number): string {
  const h = new Date(now).getHours();
  if (h >= 8  && h < 15) return "MANANA";
  if (h >= 15 && h < 22) return "TARDE";
  return "NOCHE";
}

type CeladorEntry = {
  id:          string;
  name:        string;
  onBreak:     boolean;
  breakUntil:  string | null;
  activeShift: string | null;
};

type Props = {
  transfers:       Transfer[];
  total:           number;
  riskCount:       number;
  slaPercent:      number;
  statusBreakdown: StatusEntry[];
  celadores:       CeladorEntry[];
};

function InfoTooltip({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex items-center">
      <span className="w-3.5 h-3.5 rounded-full border border-gray-400 text-gray-400 text-[9px] font-bold flex items-center justify-center cursor-default select-none leading-none">
        i
      </span>
      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 rounded-lg bg-gray-900 text-white text-xs leading-relaxed px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-lg">
        {text}
        <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
      </span>
    </span>
  );
}

const STATUS_CONFIG: Record<string, { label: string; dot: string }> = {
  SOLICITADO: { label: "Solicitado", dot: "bg-amber-400"  },
  ASIGNADO:   { label: "Asignado",   dot: "bg-blue-400"   },
  EN_CURSO:   { label: "En curso",   dot: "bg-green-500"  },
  EN_PRUEBA:  { label: "En prueba",  dot: "bg-violet-500" },
  PAUSADO:    { label: "Pausado",    dot: "bg-gray-400"   },
};

const STATUS_BADGE: Record<string, string> = {
  SOLICITADO: "bg-amber-100 text-amber-800",
  ASIGNADO:   "bg-blue-100 text-blue-800",
  EN_CURSO:   "bg-green-100 text-green-800",
  EN_PRUEBA:  "bg-violet-100 text-violet-800",
  PAUSADO:    "bg-gray-100 text-gray-600",
};

/** Franja proporcional bajo la leyenda de estados */
const STATUS_STRIP_SEGMENT: Record<string, string> = {
  SOLICITADO: "bg-amber-400",
  ASIGNADO:   "bg-blue-500",
  EN_CURSO:   "bg-emerald-500",
  EN_PRUEBA:  "bg-violet-500",
  PAUSADO:    "bg-stone-400",
};

const DIFF_CONFIG: Record<string, string> = {
  BANAL:    "text-green-700",
  MODERADO: "text-yellow-600",
  CRITICO:  "text-red-700 font-semibold",
};

function getSLAInfo(t: Transfer, now: number) {
  const minutes = (now - new Date(t.createdAt).getTime()) / 60000;
  return getSLABadge(t.status, minutes, t.priority, t.difficulty);
}

function formatElapsed(createdAt: string, now: number) {
  const minutes = Math.floor((now - new Date(createdAt).getTime()) / 60000);
  if (minutes < 1)  return "ahora mismo";
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  return `${h}h ${minutes % 60}m`;
}

export default function DashboardClient({
  transfers:       initialTransfers,
  total:           initialTotal,
  riskCount:       initialRiskCount,
  slaPercent:      initialSla,
  statusBreakdown: initialBreakdown,
  celadores:       initialCeladores,
}: Props) {
  const [now,             setNow]             = useState(Date.now());
  const [transfers,       setTransfers]       = useState(initialTransfers);
  const [total,           setTotal]           = useState(initialTotal);
  const [statusBreakdown, setStatusBreakdown] = useState(initialBreakdown);
  const [celadores,       setCeladores]       = useState<CeladorEntry[]>(initialCeladores);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  void initialRiskCount;
  void initialSla;

  const fetchDashboard = async () => {
    try {
      const res = await fetch("/api/admin/dashboard");
      if (!res.ok) return;
      const data = await res.json();
      setTransfers(data.transfers);
      setTotal(data.total);
      setStatusBreakdown(data.statusBreakdown);
      setCeladores(data.celadores);
      setNow(Date.now());
    } catch { /* ignorar */ }
  };

  useEffect(() => {
    // Reloj interno cada 10 s (para SLA countdown)
    const clock = setInterval(() => setNow(Date.now()), 10_000);

    // Polling completo cada 30 s
    pollRef.current = setInterval(fetchDashboard, 30_000);

    // SSE: refrescar inmediatamente en cualquier evento relevante
    const es = new EventSource("/api/events");
    es.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data);
        if (event.type !== "connected") fetchDashboard();
      } catch { /* ignorar */ }
    };

    return () => {
      clearInterval(clock);
      if (pollRef.current) clearInterval(pollRef.current);
      es.close();
    };
  }, []);

  const liveRiskList = useMemo(
    () => transfers.filter((t) => getSLAInfo(t, now).risk),
    [transfers, now]
  );
  const liveRiskCount = liveRiskList.length;
  const liveSla = total > 0 ? Math.round(((total - liveRiskCount) / total) * 100) : 100;

  const slaColor  = liveSla >= 90 ? "text-green-600" : liveSla >= 75 ? "text-yellow-500" : "text-red-600";
  const riskColor = liveRiskCount === 0 ? "text-green-600" : "text-red-600";

  return (
    <div className="space-y-5">

      {/* ── KPI CARDS ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-stone-200/90 bg-gradient-to-b from-white to-stone-50/80 p-5 shadow-md shadow-stone-900/[0.04] ring-1 ring-stone-100/80">
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Activos hoy</p>
          <p className="mt-1 text-4xl font-bold tabular-nums tracking-tight text-stone-900">{total}</p>
          <p className="mt-1 text-xs text-stone-500">Traslados en curso</p>
        </div>
        <div className="rounded-2xl border border-stone-200/90 bg-gradient-to-b from-white to-stone-50/80 p-5 shadow-md shadow-stone-900/[0.04] ring-1 ring-stone-100/80">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-stone-500">
            En riesgo SLA
            <InfoTooltip text="Traslados que llevan más tiempo del permitido en su estado actual según su dificultad y prioridad. Requieren atención inmediata." />
          </p>
          <p className={`mt-1 text-4xl font-bold tabular-nums tracking-tight ${riskColor}`}>{liveRiskCount}</p>
          <p className="mt-1 text-xs text-stone-500">Superan el umbral</p>
        </div>
        <div className="rounded-2xl border border-stone-200/90 bg-gradient-to-b from-white to-stone-50/80 p-5 shadow-md shadow-stone-900/[0.04] ring-1 ring-stone-100/80">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-stone-500">
            Cumplimiento SLA
            <InfoTooltip text="SLA (Service Level Agreement): porcentaje de traslados activos que están dentro del tiempo máximo permitido según su dificultad y prioridad." />
          </p>
          <p className={`mt-1 text-4xl font-bold tabular-nums tracking-tight ${slaColor}`}>{liveSla}%</p>
          <p className="mt-1 text-xs text-stone-500">En tiempo real · actualiza c/30s</p>
        </div>
      </div>

      {/* ── DISPONIBILIDAD CELADORES ── */}
      {celadores.length > 0 && (
        <div className="border border-gray-200 rounded-xl bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {SHIFT_LABEL[getShiftFromTime(now)]}
            </h2>
            <span className="text-xs text-gray-400">
              {celadores.filter((c) => !(c.onBreak && c.breakUntil && new Date(c.breakUntil) > new Date(now))).length}
              &nbsp;/&nbsp;{celadores.length} en turno
            </span>
          </div>
          {celadores.length === 0 && (
            <p className="px-5 py-4 text-xs text-gray-400 italic">
              Ningún celador tiene asignado este turno. Actualízalo desde Usuarios.
            </p>
          )}
          <div className="divide-y divide-gray-50">
            {celadores.map((c) => {
              const isOnBreak = c.onBreak && c.breakUntil && new Date(c.breakUntil) > new Date(now);
              const secsLeft  = isOnBreak
                ? Math.max(0, Math.floor((new Date(c.breakUntil!).getTime() - now) / 1000))
                : 0;
              const mm = Math.floor(secsLeft / 60).toString().padStart(2, "0");
              const ss = (secsLeft % 60).toString().padStart(2, "0");

              return (
                <div key={c.id} className="flex items-center justify-between px-5 py-2.5 gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${isOnBreak ? "bg-amber-400" : "bg-green-500"}`} />
                    <span className="text-sm text-gray-800 font-medium truncate">{c.name}</span>
                  </div>
                  {isOnBreak ? (
                    <span className="text-xs text-amber-600 font-medium shrink-0 tabular-nums">
                      ☕ {mm}:{ss}
                    </span>
                  ) : (
                    <span className="text-xs text-green-600 font-medium shrink-0">Disponible</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── ALERTAS SLA ── */}
      {liveRiskList.length > 0 && (
        <div className="border border-red-200 rounded-xl bg-red-50 p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-red-500 text-lg">⚠</span>
            <h2 className="font-semibold text-red-800 text-sm">
              {liveRiskList.length} traslado{liveRiskList.length > 1 ? "s" : ""} en riesgo SLA
            </h2>
          </div>
          <div className="space-y-2">
            {liveRiskList.map((t) => {
              const sla = getSLAInfo(t, now);
              return (
                <div
                  key={t.id}
                  className="flex items-center justify-between gap-3 bg-white border border-red-100 rounded-lg px-3 py-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`text-xs font-medium uppercase ${DIFF_CONFIG[t.difficulty] ?? ""}`}>
                      {t.difficulty}
                    </span>
                    <span className="text-sm font-medium text-gray-900 truncate">
                      {t.patientFullName}
                    </span>
                    {t.priority === "URGENTE" && (
                      <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-medium shrink-0">
                        URGENTE
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-gray-500 tabular-nums">
                      {formatElapsed(t.createdAt, now)}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${sla.color}`}>
                      {sla.label}
                    </span>
                    <Link href={`/admin/transfer/${t.id}`} className="text-xs text-red-700 hover:text-red-900 font-medium">
                      Ver →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── DESGLOSE POR ESTADO ── */}
      <div className="rounded-2xl border border-stone-200/90 bg-gradient-to-b from-white to-stone-50/80 p-5 shadow-md shadow-stone-900/[0.04] ring-1 ring-stone-100/80">
        <div className="mb-1 flex items-center justify-between gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-stone-500">
            Distribución por estado
          </h2>
        </div>
        {(() => {
          const statusTotal = statusBreakdown.reduce((a, s) => a + s.count, 0);
          return statusTotal > 0 ? (
            <div
              className="mb-4 flex h-3 w-full overflow-hidden rounded-full bg-stone-100 ring-1 ring-stone-200/70"
              role="img"
              aria-label="Proporción de traslados por estado"
            >
              {statusBreakdown.map(({ status, count }) => {
                if (count <= 0) return null;
                const pct = (count / statusTotal) * 100;
                const cfg = STATUS_CONFIG[status] ?? { label: status, dot: "bg-gray-300" };
                const seg = STATUS_STRIP_SEGMENT[status] ?? "bg-stone-300";
                return (
                  <div
                    key={status}
                    className={`min-w-[3px] shrink-0 transition-opacity hover:opacity-90 ${seg}`}
                    style={{ width: `${pct}%` }}
                    title={`${cfg.label}: ${count} (${pct.toFixed(0)}%)`}
                  />
                );
              })}
            </div>
          ) : null;
        })()}
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {statusBreakdown.map(({ status, count }) => {
            const cfg = STATUS_CONFIG[status] ?? { label: status, dot: "bg-gray-300" };
            return (
              <div key={status} className="flex items-center gap-1.5 text-sm text-stone-700">
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${cfg.dot}`} />
                <span>{cfg.label}</span>
                <span className="font-semibold tabular-nums text-stone-900">{count}</span>
              </div>
            );
          })}
          {statusBreakdown.every(({ count }) => count === 0) && (
            <p className="text-sm text-stone-500">Sin traslados activos</p>
          )}
        </div>
      </div>

      {/* ── LISTADO ACTIVOS ── */}
      <div className="border border-gray-200 rounded-xl bg-white shadow-sm overflow-hidden overflow-x-auto">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">Traslados activos hoy</h2>
          <span className="text-xs text-gray-400">En tiempo real · refresca c/30 s</span>
        </div>

        {transfers.length === 0 ? (
          <div className="py-14 flex flex-col items-center justify-center text-center gap-2">
            <span className="text-4xl">✓</span>
            <p className="font-medium text-gray-700">No hay traslados activos</p>
            <p className="text-sm text-gray-400">
              Todos los traslados de hoy están finalizados
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {transfers.map((t) => {
              const sla      = getSLAInfo(t, now);
              const isUrgent = t.priority === "URGENTE";
              const isCrit   = t.difficulty === "CRITICO";
              const statusBadge = STATUS_BADGE[t.status] ?? "bg-gray-100 text-gray-600";

              return (
                <div
                  key={t.id}
                  className={`flex items-center justify-between px-4 sm:px-5 py-3.5 gap-3 min-w-0 ${
                    isCrit ? "bg-red-50/30 border-l-4 border-l-red-400" :
                    isUrgent ? "border-l-4 border-l-orange-400" : ""
                  }`}
                >
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-gray-900 truncate text-sm">
                        {t.patientFullName}
                      </span>
                      {isUrgent && (
                        <span className="px-1.5 py-0.5 rounded text-xs font-bold bg-red-100 text-red-700 uppercase shrink-0">
                          Urgente
                        </span>
                      )}
                      {isCrit && (
                        <span className="hidden sm:inline px-1.5 py-0.5 rounded text-xs font-bold bg-red-50 text-red-600 border border-red-100 shrink-0">
                          Crítico
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap">
                      <span className="truncate max-w-[120px] sm:max-w-none">{t.location}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge}`}>
                        {STATUS_CONFIG[t.status]?.label ?? t.status}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                    <span className="hidden sm:block text-xs text-gray-400 tabular-nums">
                      {formatElapsed(t.createdAt, now)}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${sla.color}`}>
                      {sla.label}
                    </span>
                    <Link
                      href={`/admin/transfer/${t.id}`}
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Ver →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── ACCESOS RÁPIDOS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { href: "/admin/users",              icon: "👥", label: "Gestión de usuarios",   sub: "Crear, editar y gestionar roles"     },
          { href: "/admin/transfers",          icon: "🚑", label: "Historial de traslados", sub: "Consultar todos los traslados"       },
          { href: "/admin/stats/globalStats",  icon: "📊", label: "Estadísticas",           sub: "Rendimiento global y por rol"        },
        ].map(({ href, icon, label, sub }) => (
          <Link
            key={href}
            href={href}
            className="border border-gray-200 rounded-xl p-4 bg-white shadow-sm hover:bg-gray-50 transition-colors group"
          >
            <div className="text-2xl mb-2">{icon}</div>
            <p className="font-medium text-sm text-gray-800 group-hover:text-blue-600">{label}</p>
            <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
