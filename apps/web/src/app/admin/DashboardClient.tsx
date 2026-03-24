"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Transfer = {
  id: string;
  patientFullName: string;
  location: string;
  status: string;
  priority: string;
  createdAt: string;
};

type StatusEntry = {
  status: string;
  count: number;
};

type Props = {
  transfers: Transfer[];
  total: number;
  riskCount: number;
  slaPercent: number;
  statusBreakdown: StatusEntry[];
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  SOLICITADO: { label: "Solicitado", color: "bg-amber-100 text-amber-800" },
  ASIGNADO:   { label: "Asignado",   color: "bg-blue-100 text-blue-800" },
  EN_CURSO:   { label: "En curso",   color: "bg-indigo-100 text-indigo-800" },
  EN_PRUEBA:  { label: "En prueba",  color: "bg-purple-100 text-purple-800" },
  PAUSADO:    { label: "Pausado",    color: "bg-gray-100 text-gray-700" },
};

function getSLAInfo(t: Transfer, now: number) {
  const minutes = (now - new Date(t.createdAt).getTime()) / 60000;

  if (t.priority === "URGENTE") {
    if (minutes > 5) return { label: "En riesgo", color: "bg-red-500 text-white", risk: true };
    if (minutes > 3) return { label: "Atención",  color: "bg-yellow-400 text-yellow-900", risk: false };
    return { label: "OK", color: "bg-green-500 text-white", risk: false };
  }

  if (minutes > 15) return { label: "En riesgo", color: "bg-red-500 text-white", risk: true };
  if (minutes > 10) return { label: "Atención",  color: "bg-yellow-400 text-yellow-900", risk: false };
  return { label: "OK", color: "bg-green-500 text-white", risk: false };
}

function formatElapsed(createdAt: string, now: number) {
  const minutes = Math.floor((now - new Date(createdAt).getTime()) / 60000);
  if (minutes < 1) return "ahora mismo";
  if (minutes === 1) return "hace 1 min";
  return `hace ${minutes} min`;
}

export default function DashboardClient({
  transfers,
  total,
  riskCount: initialRiskCount,
  slaPercent: initialSla,
  statusBreakdown,
}: Props) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(timer);
  }, []);

  const liveRiskCount = useMemo(
    () => transfers.filter((t) => getSLAInfo(t, now).risk).length,
    [transfers, now]
  );

  const liveSla = total > 0 ? Math.round(((total - liveRiskCount) / total) * 100) : 100;

  const slaColor =
    liveSla >= 90 ? "text-green-600" : liveSla >= 75 ? "text-yellow-500" : "text-red-600";
  const riskColor = liveRiskCount === 0 ? "text-green-600" : "text-red-600";

  // Silence unused warnings from server-computed initial values
  void initialRiskCount;
  void initialSla;

  return (
    <div className="space-y-6">

      {/* ── KPI CARDS ── */}
      <div className="grid grid-cols-3 gap-4">
        <div className="border rounded-xl p-5 shadow-sm bg-white">
          <p className="text-sm text-gray-500">Activos hoy</p>
          <p className="text-4xl font-bold text-gray-900 mt-1">{total}</p>
          <p className="text-xs text-gray-400 mt-2">traslados en curso</p>
        </div>

        <div className="border rounded-xl p-5 shadow-sm bg-white">
          <p className="text-sm text-gray-500">En riesgo</p>
          <p className={`text-4xl font-bold mt-1 ${riskColor}`}>{liveRiskCount}</p>
          <p className="text-xs text-gray-400 mt-2">superan el umbral SLA</p>
        </div>

        <div className="border rounded-xl p-5 shadow-sm bg-white">
          <p className="text-sm text-gray-500">Cumplimiento SLA</p>
          <p className={`text-4xl font-bold mt-1 ${slaColor}`}>{liveSla}%</p>
          <p className="text-xs text-gray-400 mt-2">en tiempo real</p>
        </div>
      </div>

      {/* ── DESGLOSE POR ESTADO ── */}
      <div className="border rounded-xl p-5 shadow-sm bg-white">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">
          Distribución por estado
        </h2>
        <div className="flex gap-3 flex-wrap">
          {statusBreakdown.map(({ status, count }) => {
            const cfg = STATUS_CONFIG[status] ?? {
              label: status,
              color: "bg-gray-100 text-gray-700",
            };
            return (
              <div
                key={status}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${cfg.color}`}
              >
                <span>{cfg.label}</span>
                <span className="font-bold">{count}</span>
              </div>
            );
          })}
          {statusBreakdown.every(({ count }) => count === 0) && (
            <p className="text-sm text-gray-400">Sin traslados activos</p>
          )}
        </div>
      </div>

      {/* ── LISTADO DE TRASLADOS ── */}
      <div className="border rounded-xl shadow-sm bg-white overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">Traslados activos hoy</h2>
          <span className="text-xs text-gray-400">Actualización cada 10 s</span>
        </div>

        {transfers.length === 0 ? (
          <div className="py-14 flex flex-col items-center justify-center text-center gap-2">
            <span className="text-4xl">✓</span>
            <p className="font-medium text-gray-700">No hay traslados activos</p>
            <p className="text-sm text-gray-400">
              Todos los traslados de hoy están finalizados o aún no se han creado
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {transfers.map((t) => {
              const sla = getSLAInfo(t, now);
              const isUrgent = t.priority === "URGENTE";
              const statusCfg = STATUS_CONFIG[t.status] ?? {
                label: t.status,
                color: "bg-gray-100 text-gray-700",
              };

              return (
                <div
                  key={t.id}
                  className={`flex items-center justify-between px-5 py-4 gap-4 ${
                    isUrgent ? "border-l-4 border-l-red-500 bg-red-50/40" : ""
                  }`}
                >
                  {/* Información del paciente */}
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-gray-900 truncate">
                        {t.patientFullName}
                      </span>
                      {isUrgent && (
                        <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-700 uppercase shrink-0">
                          ⚠ Urgente
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-500 flex-wrap">
                      <span>{t.location}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${statusCfg.color}`}
                      >
                        {statusCfg.label}
                      </span>
                    </div>
                  </div>

                  {/* Tiempo + SLA + enlace */}
                  <div className="flex items-center gap-4 shrink-0">
                    <span className="text-xs text-gray-400 tabular-nums">
                      {formatElapsed(t.createdAt, now)}
                    </span>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${sla.color}`}
                    >
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
      <div className="grid grid-cols-3 gap-4">
        <Link
          href="/admin/users"
          className="border rounded-xl p-4 shadow-sm bg-white hover:bg-gray-50 transition-colors group"
        >
          <div className="text-2xl mb-2">👥</div>
          <p className="font-medium text-gray-800 group-hover:text-blue-600">
            Gestión de usuarios
          </p>
          <p className="text-xs text-gray-400 mt-1">Crear, editar y gestionar roles</p>
        </Link>

        <Link
          href="/admin/transfers"
          className="border rounded-xl p-4 shadow-sm bg-white hover:bg-gray-50 transition-colors group"
        >
          <div className="text-2xl mb-2">🚑</div>
          <p className="font-medium text-gray-800 group-hover:text-blue-600">
            Historial de traslados
          </p>
          <p className="text-xs text-gray-400 mt-1">Consultar todos los traslados</p>
        </Link>

        <Link
          href="/admin/stats/globalStats"
          className="border rounded-xl p-4 shadow-sm bg-white hover:bg-gray-50 transition-colors group"
        >
          <div className="text-2xl mb-2">📊</div>
          <p className="font-medium text-gray-800 group-hover:text-blue-600">
            Estadísticas
          </p>
          <p className="text-xs text-gray-400 mt-1">Rendimiento global y por rol</p>
        </Link>
      </div>
    </div>
  );
}
