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
  transfers,
  total,
  riskCount: initialRiskCount,
  slaPercent: initialSla,
  statusBreakdown,
  celadores: initialCeladores,
}: Props) {
  const [now,       setNow]       = useState(Date.now());
  const [celadores, setCeladores] = useState<CeladorEntry[]>(initialCeladores);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchCeladores = async () => {
    try {
      const res = await fetch("/api/admin/celadores");
      if (res.ok) setCeladores(await res.json());
    } catch { /* ignorar */ }
  };

  useEffect(() => {
    // Reloj interno cada 10 s (para SLA y countdown)
    const timer = setInterval(() => setNow(Date.now()), 10_000);

    // Polling celadores cada 30 s
    pollRef.current = setInterval(fetchCeladores, 30_000);

    // SSE: refrescar inmediatamente al detectar cambio de descanso
    const es = new EventSource("/api/events");
    es.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data);
        if (event.type === "celador:break") fetchCeladores();
      } catch { /* ignorar */ }
    };

    return () => {
      clearInterval(timer);
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

  const slaColor   = liveSla >= 90 ? "text-green-600" : liveSla >= 75 ? "text-yellow-500" : "text-red-600";
  const riskColor  = liveRiskCount === 0 ? "text-green-600" : "text-red-600";

  void initialRiskCount;
  void initialSla;

  return (
    <div className="space-y-5">

      {/* ── KPI CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="border border-gray-200 rounded-xl p-5 bg-white shadow-sm">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Activos hoy</p>
          <p className="text-4xl font-bold text-gray-900 mt-1">{total}</p>
          <p className="text-xs text-gray-400 mt-1">traslados en curso</p>
        </div>
        <div className="border border-gray-200 rounded-xl p-5 bg-white shadow-sm">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">En riesgo SLA</p>
          <p className={`text-4xl font-bold mt-1 ${riskColor}`}>{liveRiskCount}</p>
          <p className="text-xs text-gray-400 mt-1">superan el umbral</p>
        </div>
        <div className="border border-gray-200 rounded-xl p-5 bg-white shadow-sm">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Cumplimiento SLA</p>
          <p className={`text-4xl font-bold mt-1 ${slaColor}`}>{liveSla}%</p>
          <p className="text-xs text-gray-400 mt-1">en tiempo real · actualiza c/10s</p>
        </div>
      </div>

      {/* ── DISPONIBILIDAD CELADORES ── */}
      {celadores.length > 0 && (
        <div className="border border-gray-200 rounded-xl bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Celadores · {SHIFT_LABEL[getShiftFromTime(now)]}
            </h2>
            <span className="text-xs text-gray-400">
              {celadores.filter((c) => !(c.onBreak && c.breakUntil && new Date(c.breakUntil) > new Date(now))).length}
              &nbsp;/&nbsp;{celadores.length} disponibles
            </span>
          </div>
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
      <div className="border border-gray-200 rounded-xl p-5 bg-white shadow-sm">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Distribución por estado
        </h2>
        <div className="flex gap-3 flex-wrap">
          {statusBreakdown.map(({ status, count }) => {
            const cfg = STATUS_CONFIG[status] ?? { label: status, dot: "bg-gray-300" };
            return (
              <div key={status} className="flex items-center gap-1.5 text-sm text-gray-700">
                <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
                <span>{cfg.label}</span>
                <span className="font-semibold text-gray-900">{count}</span>
              </div>
            );
          })}
          {statusBreakdown.every(({ count }) => count === 0) && (
            <p className="text-sm text-gray-400">Sin traslados activos</p>
          )}
        </div>
      </div>

      {/* ── LISTADO ACTIVOS ── */}
      <div className="border border-gray-200 rounded-xl bg-white shadow-sm overflow-hidden overflow-x-auto">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">Traslados activos hoy</h2>
          <span className="text-xs text-gray-400">Actualización cada 10 s</span>
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
