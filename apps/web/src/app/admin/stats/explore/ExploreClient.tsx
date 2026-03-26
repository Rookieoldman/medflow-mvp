"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import Link from "next/link";
import { formatDateOnlyLocal, rangeFromYMD } from "@/lib/statsExplore";
import type { StatsScopeKey } from "@/lib/adminStatsPeriod";
import type { ExploreBlock } from "./loadData";
import type { ExploreTrendsResult } from "./trends";
import ExploreTrendsChart from "./ExploreTrendsChart";

type Props = {
  initial: {
    from: string;
    to: string;
    scope: StatsScopeKey;
    view: string;
    kpi?: string;
    dim?: string;
    val?: string;
    cFrom?: string;
    cTo?: string;
  };
  primary:   ExploreBlock;
  secondary: ExploreBlock | null;
  trendsPrimary:   ExploreTrendsResult;
  trendsSecondary: ExploreTrendsResult | null;
  pageTitle: string;
};

function splitYMD(iso: string) {
  const p = iso.split("-").map(Number);
  return { y: p[0] ?? new Date().getFullYear(), m: p[1] ?? 1, d: p[2] ?? 1 };
}

export default function ExploreClient({
  initial,
  primary,
  secondary,
  trendsPrimary,
  trendsSecondary,
  pageTitle,
}: Props) {
  const router = useRouter();
  const ya = splitYMD(initial.from);
  const yb = splitYMD(initial.to);
  /* Si from y to son el mismo día, modo día; si mismo mes distinto día usar mes; simplificamos con estado derivado del primer clic */
  const [yA, setYA] = useState(ya.y);
  const [mA, setMA] = useState(ya.m);
  const [dA, setDA] = useState(
    initial.from === initial.to ? ya.d : 0
  );
  const [yB, setYB] = useState(yb.y);
  const [mB, setMB] = useState(yb.m);
  const [dB, setDB] = useState(
    initial.from === initial.to ? yb.d : 0
  );
  const [scope, setScope] = useState<StatsScopeKey>(initial.scope);
  const [compare, setCompare] = useState(!!initial.cFrom && !!initial.cTo);

  const years = useMemo(() => {
    const cy = new Date().getFullYear();
    return Array.from({ length: 8 }, (_, i) => cy - i);
  }, []);

  function applyRange() {
    const { from, to } = rangeFromYMD(yA, mA || 0, dA || 0);
    const fromS = formatDateOnlyLocal(from);
    const toS   = formatDateOnlyLocal(to);
    const q = new URLSearchParams();
    q.set("view", initial.view);
    q.set("from", fromS);
    q.set("to", toS);
    if (scope) q.set("scope", scope);
    if (initial.kpi) q.set("kpi", initial.kpi);
    if (initial.dim) q.set("dim", initial.dim);
    if (initial.val) q.set("val", initial.val);
    if (compare) {
      const r2 = rangeFromYMD(yB, mB || 0, dB || 0);
      q.set("cFrom", formatDateOnlyLocal(r2.from));
      q.set("cTo", formatDateOnlyLocal(r2.to));
    }
    router.push(`/admin/stats/explore?${q.toString()}`);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">{pageTitle}</h1>
          <p className="text-sm text-gray-500 mt-1">
            Ajusta año, mes y día y pulsa <strong>Aplicar</strong>. Activa comparación para ver dos períodos lado a lado.
          </p>
        </div>
        <Link
          href="/admin/stats?tab=global"
          className="text-sm text-gray-600 hover:text-gray-900 underline shrink-0"
        >
          ← Volver a estadísticas
        </Link>
      </div>

      <section className="border border-gray-200 rounded-xl bg-white p-4 sm:p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-800">Período principal</h2>
        <div className="flex flex-wrap gap-3 items-end">
          <label className="flex flex-col gap-1 text-xs text-gray-600">
            Año
            <select
              value={yA}
              onChange={(e) => setYA(Number(e.target.value))}
              className="border rounded-lg px-2 py-2 text-sm bg-white"
            >
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-gray-600">
            Mes (vacío = año completo)
            <select
              value={mA || ""}
              onChange={(e) => setMA(e.target.value ? Number(e.target.value) : 0)}
              className="border rounded-lg px-2 py-2 text-sm bg-white min-w-[120px]"
            >
              <option value="">Todo el año</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {new Date(2000, m - 1).toLocaleString("es", { month: "long" })}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-gray-600">
            Día (vacío = mes completo)
            <select
              value={dA || ""}
              onChange={(e) => setDA(e.target.value ? Number(e.target.value) : 0)}
              disabled={!mA}
              className="border rounded-lg px-2 py-2 text-sm bg-white min-w-[72px] disabled:opacity-40"
            >
              <option value="">—</option>
              {mA
                ? Array.from(
                    { length: new Date(yA, mA, 0).getDate() },
                    (_, i) => i + 1
                  ).map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))
                : null}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-gray-600">
            Ámbito
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value as StatsScopeKey)}
              className="border rounded-lg px-2 py-2 text-sm bg-white min-w-[140px]"
            >
              <option value="">Todos</option>
              <option value="PLANTA">Planta</option>
              <option value="URGENCIAS">Urgencias</option>
            </select>
          </label>
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={compare}
            onChange={(e) => setCompare(e.target.checked)}
          />
          Comparar con otro período
        </label>

        {compare && (
          <div className="border-t border-gray-100 pt-4 space-y-2">
            <h3 className="text-sm font-semibold text-gray-700">Período de comparación</h3>
            <div className="flex flex-wrap gap-3 items-end">
              <label className="flex flex-col gap-1 text-xs text-gray-600">
                Año
                <select
                  value={yB}
                  onChange={(e) => setYB(Number(e.target.value))}
                  className="border rounded-lg px-2 py-2 text-sm bg-white"
                >
                  {years.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs text-gray-600">
                Mes
                <select
                  value={mB || ""}
                  onChange={(e) => setMB(e.target.value ? Number(e.target.value) : 0)}
                  className="border rounded-lg px-2 py-2 text-sm bg-white min-w-[120px]"
                >
                  <option value="">Todo el año</option>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>
                      {new Date(2000, m - 1).toLocaleString("es", { month: "long" })}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs text-gray-600">
                Día
                <select
                  value={dB || ""}
                  onChange={(e) => setDB(e.target.value ? Number(e.target.value) : 0)}
                  disabled={!mB}
                  className="border rounded-lg px-2 py-2 text-sm bg-white min-w-[72px] disabled:opacity-40"
                >
                  <option value="">—</option>
                  {mB
                    ? Array.from(
                        { length: new Date(yB, mB, 0).getDate() },
                        (_, i) => i + 1
                      ).map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))
                    : null}
                </select>
              </label>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={applyRange}
          className="rounded-lg bg-gray-900 text-white text-sm font-medium px-4 py-2 hover:bg-gray-800"
        >
          Aplicar filtros
        </button>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-800">Tendencias en el tiempo</h2>
        <p className="text-xs text-gray-500 -mt-1">
          Mismos filtros de ámbito y fechas que arriba. Al comparar períodos verás dos gráficos.
        </p>
        <div className={`grid gap-6 ${trendsSecondary ? "lg:grid-cols-2" : ""}`}>
          <ExploreTrendsChart periodLabel="Período principal" result={trendsPrimary} />
          {trendsSecondary ? (
            <ExploreTrendsChart periodLabel="Período de comparación" result={trendsSecondary} />
          ) : null}
        </div>
      </section>

      <div className={`grid gap-6 ${secondary ? "lg:grid-cols-2" : ""}`}>
        <ExploreBlockView block={primary} label="Período principal" />
        {secondary && <ExploreBlockView block={secondary} label="Período comparación" />}
      </div>
    </div>
  );
}

function ExploreBlockView({ block, label }: { block: ExploreBlock; label: string }) {
  return (
    <div className="border border-gray-200 rounded-xl bg-white overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
        <h2 className="font-semibold text-gray-900">{block.title}</h2>
      </div>
      <div className="p-4 max-h-[560px] overflow-auto">
        {block.kind === "breakdown" && <BreakdownTable rows={block.rows} />}
        {block.kind === "list" && <TransferTable rows={block.rows} total={block.total} />}
        {block.kind === "incidents" && <IncidentTable rows={block.rows} total={block.total} />}
      </div>
    </div>
  );
}

function BreakdownTable({ rows }: { rows: { key: string; label: string; count: number }[] }) {
  if (!rows.length) {
    return <p className="text-sm text-gray-400">Sin datos en este período.</p>;
  }
  const max = Math.max(...rows.map((r) => r.count), 1);
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-gray-500 border-b">
          <th className="pb-2 pr-2">Categoría</th>
          <th className="pb-2 text-right">Nº</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {rows.map((r) => (
          <tr key={r.key}>
            <td className="py-2 pr-2">{r.label}</td>
            <td className="py-2 text-right font-medium">{r.count}</td>
            <td className="py-2 pl-2 w-32 hidden sm:table-cell">
              <div className="h-2 rounded-full bg-gray-100">
                <div
                  className="h-2 rounded-full bg-gray-800"
                  style={{ width: `${Math.round((r.count / max) * 100)}%` }}
                />
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function TransferTable({
  rows,
  total,
}: {
  rows: {
    id: string;
    mrn: string;
    patientFullName: string;
    status: string;
    priority: string;
    createdAt: string;
  }[];
  total: number;
}) {
  if (!rows.length) {
    return <p className="text-sm text-gray-400">Sin registros.</p>;
  }
  return (
    <>
      {total > rows.length && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-2 py-1.5 mb-3">
          Mostrando {rows.length} de {total}. Acota el período o exporta desde traslados si necesitas el listado completo.
        </p>
      )}
      <table className="w-full text-xs sm:text-sm">
        <thead>
          <tr className="text-left text-gray-500 border-b">
            <th className="pb-2">MRN</th>
            <th className="pb-2">Paciente</th>
            <th className="pb-2">Estado</th>
            <th className="pb-2">Prio.</th>
            <th className="pb-2" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((r) => (
            <tr key={r.id} className="hover:bg-gray-50">
              <td className="py-2 font-mono text-gray-500">{r.mrn}</td>
              <td className="py-2 max-w-[140px] truncate">{r.patientFullName}</td>
              <td className="py-2">{r.status}</td>
              <td className="py-2">{r.priority}</td>
              <td className="py-2 text-right">
                <Link href={`/admin/transfer/${r.id}`} className="text-blue-600 hover:underline">
                  Ver
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function IncidentTable({
  rows,
  total,
}: {
  rows: {
    id: string;
    type: string;
    mrn: string;
    createdAt: string;
    transferId: string;
  }[];
  total: number;
}) {
  if (!rows.length) {
    return <p className="text-sm text-gray-400">Sin incidencias.</p>;
  }
  return (
    <>
      {total > rows.length && (
        <p className="text-xs text-amber-700 mb-2">Mostrando {rows.length} de {total}</p>
      )}
      <table className="w-full text-xs sm:text-sm">
        <thead>
          <tr className="text-left text-gray-500 border-b">
            <th className="pb-2">Fecha</th>
            <th className="pb-2">Tipo</th>
            <th className="pb-2">MRN</th>
            <th className="pb-2" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="py-2 whitespace-nowrap">
                {new Date(r.createdAt).toLocaleString("es-ES", {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </td>
              <td className="py-2">{r.type}</td>
              <td className="py-2 font-mono">{r.mrn}</td>
              <td className="py-2 text-right">
                <Link href={`/admin/transfer/${r.transferId}`} className="text-blue-600 hover:underline">
                  Traslado
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
