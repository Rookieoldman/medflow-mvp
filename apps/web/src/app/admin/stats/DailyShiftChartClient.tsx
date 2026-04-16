"use client";

import Link from "next/link";
import { createPortal } from "react-dom";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { chartAxisTick, chartLegendWrapperStyle, chartTooltipProps } from "@/lib/chartTheme";
import type {
  DailyFinishedTransferDetail,
  DailyShiftRow,
} from "@/lib/statsDailyByShift";

const COL = {
  MANANA: "#ca8a04",
  TARDE: "#ea580c",
  NOCHE: "#4f46e5",
  total: "#111827",
} as const;

const TEST_LABELS: Record<string, string> = {
  RM: "RM",
  ECO: "Eco",
  RX: "RX",
  MEDICINA_NUCLEAR: "Med. Nuclear",
  TC: "TC",
};

const SHIFT_SHORT: Record<string, string> = {
  MANANA: "Mañana",
  TARDE: "Tarde",
  NOCHE: "Noche",
};

const SCOPE_LABELS: Record<string, string> = {
  PLANTA: "Planta",
  URGENCIAS: "Urgencias",
};

const SHIFT_ORDER = ["MANANA", "TARDE", "NOCHE"] as const;
type ShiftKey = (typeof SHIFT_ORDER)[number];

const SHIFT_UI: Record<
  ShiftKey,
  { label: string; sub: string; bar: string; soft: string; ring: string }
> = {
  MANANA: {
    label: "Mañana",
    sub: "08:00 – 14:59",
    bar: "bg-amber-500",
    soft: "bg-amber-50 text-amber-900 border-amber-200/80",
    ring: "ring-amber-400/30",
  },
  TARDE: {
    label: "Tarde",
    sub: "15:00 – 21:59",
    bar: "bg-orange-500",
    soft: "bg-orange-50 text-orange-900 border-orange-200/80",
    ring: "ring-orange-400/30",
  },
  NOCHE: {
    label: "Noche",
    sub: "22:00 – 07:59",
    bar: "bg-indigo-500",
    soft: "bg-indigo-50 text-indigo-900 border-indigo-200/80",
    ring: "ring-indigo-400/30",
  },
};

const PRIORITY_PILL: Record<string, string> = {
  URGENTE: "bg-red-50 text-red-800 border-red-200",
  NORMAL: "bg-slate-100 text-slate-700 border-slate-200",
};

const DIFF_PILL: Record<string, string> = {
  BANAL: "bg-emerald-50 text-emerald-800 border-emerald-200",
  MODERADO: "bg-amber-50 text-amber-800 border-amber-200",
  CRITICO: "bg-rose-50 text-rose-900 border-rose-200 font-medium",
};

const TEST_PILL: Record<string, string> = {
  RM: "bg-violet-50 text-violet-800 border-violet-200",
  ECO: "bg-sky-50 text-sky-800 border-sky-200",
  RX: "bg-slate-100 text-slate-800 border-slate-200",
  TC: "bg-cyan-50 text-cyan-800 border-cyan-200",
  MEDICINA_NUCLEAR: "bg-fuchsia-50 text-fuchsia-900 border-fuchsia-200",
};

function closureDurationLabel(createdAt: string, updatedAt: string): string {
  const m = Math.round(
    (new Date(updatedAt).getTime() - new Date(createdAt).getTime()) / 60_000
  );
  if (m < 1) return "< 1 min";
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h}h ${r}min` : `${h}h`;
}

function Pill({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium leading-none ${className}`}
    >
      {children}
    </span>
  );
}

type DayDrawerProps = {
  dayKey: string;
  dayTitle: string;
  summaryRow: DailyShiftRow | undefined;
  transfers: DailyFinishedTransferDetail[];
  onClose: () => void;
};

function DayFinishedDetailDrawer({
  dayKey,
  dayTitle,
  summaryRow,
  transfers,
  onClose,
}: DayDrawerProps) {
  const [shiftFilter, setShiftFilter] = useState<"ALL" | ShiftKey>("ALL");

  useEffect(() => {
    setShiftFilter("ALL");
  }, [dayKey]);

  const filtered = useMemo(() => {
    if (shiftFilter === "ALL") return transfers;
    return transfers.filter((t) => t.closedShift === shiftFilter);
  }, [transfers, shiftFilter]);

  const grouped = useMemo(() => {
    const map: Record<ShiftKey, DailyFinishedTransferDetail[]> = {
      MANANA: [],
      TARDE: [],
      NOCHE: [],
    };
    for (const t of filtered) {
      const k = t.closedShift as ShiftKey;
      if (map[k]) map[k].push(t);
    }
    for (const sk of SHIFT_ORDER) {
      map[sk].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
    }
    return map;
  }, [filtered]);

  const totalFiltered = filtered.length;

  return (
    <div
      className="relative z-10 flex h-full w-full max-w-[min(100vw,26rem)] sm:max-w-[min(100vw,32rem)] lg:max-w-[min(100vw,40rem)] flex-col bg-[#fafaf9] shadow-2xl ring-1 ring-stone-200/90 animate-in slide-in-from-right duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="daily-shift-drawer-title"
    >
      {/* Cabecera */}
      <header className="relative shrink-0 overflow-hidden border-b border-stone-200/90 bg-gradient-to-br from-stone-900 via-stone-800 to-stone-900 px-5 pb-6 pt-5 text-white">
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/5 blur-2xl"
          aria-hidden
        />
        <div className="relative flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium uppercase tracking-wider text-stone-400">
              Cierres del día
            </p>
            <h2
              id="daily-shift-drawer-title"
              className="mt-1 text-lg font-semibold leading-snug capitalize text-white sm:text-xl"
            >
              {dayTitle}
            </h2>
            {summaryRow && (
              <p className="mt-2 text-sm text-stone-300">
                <span className="font-semibold text-white">{summaryRow.total}</span> traslados
                finalizados en total
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/10 text-sm font-medium text-white transition hover:bg-white/20"
            aria-label="Cerrar panel"
          >
            ✕
          </button>
        </div>

        {summaryRow && (
          <div className="relative mt-5 grid grid-cols-3 gap-2">
            {SHIFT_ORDER.map((sk) => {
              const ui = SHIFT_UI[sk];
              const n = summaryRow[sk];
              return (
                <div
                  key={sk}
                  className="rounded-xl border border-white/10 bg-white/5 px-2 py-2.5 text-center backdrop-blur-sm"
                >
                  <div className={`mx-auto mb-1 h-1 w-8 rounded-full ${ui.bar}`} />
                  <p className="text-[10px] font-medium uppercase tracking-wide text-stone-400">
                    {ui.label}
                  </p>
                  <p className="text-lg font-bold tabular-nums text-white">{n}</p>
                </div>
              );
            })}
          </div>
        )}
      </header>

      {/* Filtros */}
      {transfers.length > 0 && (
        <div className="shrink-0 border-b border-stone-200 bg-white px-4 py-3">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-stone-500">
            Ver por turno de cierre
          </p>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setShiftFilter("ALL")}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                shiftFilter === "ALL"
                  ? "bg-stone-900 text-white shadow-sm"
                  : "bg-stone-100 text-stone-600 hover:bg-stone-200"
              }`}
            >
              Todos ({transfers.length})
            </button>
            {SHIFT_ORDER.map((sk) => {
              const ui = SHIFT_UI[sk];
              const c = transfers.filter((t) => t.closedShift === sk).length;
              return (
                <button
                  key={sk}
                  type="button"
                  onClick={() => setShiftFilter(sk)}
                  disabled={c === 0}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
                    shiftFilter === sk
                      ? `${ui.soft} ring-2 ${ui.ring}`
                      : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
                  }`}
                >
                  {ui.label} ({c})
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Lista */}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
        {transfers.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-stone-300 bg-white/80 px-6 py-14 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-100 text-2xl text-stone-400">
              ◷
            </div>
            <p className="text-sm font-medium text-stone-700">Sin datos para este día</p>
            <p className="mt-1 max-w-xs text-xs text-stone-500">
              No hay traslados finalizados en el período filtrado para esta fecha.
            </p>
          </div>
        ) : totalFiltered === 0 ? (
          <p className="text-center text-sm text-stone-500">Nada que mostrar con este filtro.</p>
        ) : shiftFilter === "ALL" ? (
          <div className="space-y-8">
            {SHIFT_ORDER.map((sk) => {
              const list = grouped[sk];
              if (list.length === 0) return null;
              const ui = SHIFT_UI[sk];
              return (
                <section key={sk} aria-label={`Traslados turno ${ui.label}`}>
                  <div className="mb-3 flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${ui.bar}`} />
                    <h3 className="text-sm font-semibold text-stone-800">{ui.label}</h3>
                    <span className="text-xs text-stone-500">{ui.sub}</span>
                    <span className="ml-auto rounded-full bg-stone-200/80 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-stone-700">
                      {list.length}
                    </span>
                  </div>
                  <ul className="space-y-3">
                    {list.map((t) => (
                      <TransferDetailCard key={t.id} t={t} accent={sk} />
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        ) : (
          <ul className="space-y-3">
            {filtered.map((t) => (
              <TransferDetailCard key={t.id} t={t} accent={shiftFilter} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function TransferDetailCard({
  t,
  accent,
}: {
  t: DailyFinishedTransferDetail;
  accent: ShiftKey;
}) {
  const ui = SHIFT_UI[accent];
  const testPill = TEST_PILL[t.testType] ?? "bg-stone-100 text-stone-800 border-stone-200";
  const priPill = PRIORITY_PILL[t.priority] ?? PRIORITY_PILL.NORMAL;
  const diffPill = DIFF_PILL[t.difficulty] ?? "bg-stone-100 text-stone-700 border-stone-200";

  return (
    <li>
      <article
        className={`group relative overflow-hidden rounded-2xl border border-stone-200/90 bg-white shadow-sm transition hover:border-stone-300 hover:shadow-md ${ui.ring} hover:ring-2`}
      >
        <div className={`absolute left-0 top-0 h-full w-1 ${ui.bar}`} aria-hidden />
        <div className="pl-4 pr-3 py-3 sm:pl-5 sm:pr-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-semibold leading-tight text-stone-900">
                {t.patientFullName}
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <Pill className="font-mono text-[10px] text-stone-600">{t.mrn}</Pill>
                <Pill className={testPill}>{TEST_LABELS[t.testType] ?? t.testType}</Pill>
                <Pill className={priPill}>
                  {t.priority === "URGENTE" ? "Urgente" : "Normal"}
                </Pill>
                <Pill className={diffPill}>
                  {t.difficulty === "CRITICO"
                    ? "Crítico"
                    : t.difficulty === "BANAL"
                      ? "Banal"
                      : "Moderado"}
                </Pill>
                <Pill className="border-stone-200 bg-stone-50 text-stone-600">
                  {SCOPE_LABELS[t.scope] ?? t.scope}
                </Pill>
              </div>
            </div>
            <Link
              href={`/admin/transfer/${t.id}`}
              className="inline-flex shrink-0 items-center justify-center gap-1 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs font-semibold text-stone-800 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-900"
            >
              Ficha
              <span aria-hidden className="text-blue-600">
                →
              </span>
            </Link>
          </div>

          <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-stone-600">
            <span className="mt-0.5 text-stone-400" aria-hidden>
              📍
            </span>
            <span>{t.location}</span>
          </p>

          <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-stone-100 pt-3 text-xs sm:grid-cols-3">
            <div>
              <dt className="text-[10px] font-medium uppercase tracking-wide text-stone-400">
                Nacimiento
              </dt>
              <dd className="mt-0.5 font-medium text-stone-800">{formatDob(t.dob)}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-medium uppercase tracking-wide text-stone-400">
                Creado
              </dt>
              <dd className="mt-0.5 text-stone-800">{formatDateTime(t.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-medium uppercase tracking-wide text-stone-400">
                Cerrado
              </dt>
              <dd className="mt-0.5 font-semibold text-stone-900">{formatDateTime(t.updatedAt)}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-medium uppercase tracking-wide text-stone-400">
                Turno cierre
              </dt>
              <dd className="mt-0.5 text-stone-800">{SHIFT_SHORT[t.closedShift] ?? t.closedShift}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-[10px] font-medium uppercase tracking-wide text-stone-400">
                Tiempo hasta cierre
              </dt>
              <dd className="mt-0.5 text-stone-800">{closureDurationLabel(t.createdAt, t.updatedAt)}</dd>
            </div>
            <div className="col-span-2 sm:col-span-3">
              <dt className="text-[10px] font-medium uppercase tracking-wide text-stone-400">
                Equipo
              </dt>
              <dd className="mt-1 flex flex-col gap-0.5 text-stone-800 sm:flex-row sm:flex-wrap sm:gap-x-4">
                <span>
                  <span className="text-stone-500">Técnico:</span> {t.createdByLabel}
                </span>
                <span>
                  <span className="text-stone-500">Celador:</span> {t.assignedToLabel ?? "—"}
                </span>
              </dd>
            </div>
          </dl>
        </div>
      </article>
    </li>
  );
}

type Props = {
  data: DailyShiftRow[];
  finishedByDay: Record<string, DailyFinishedTransferDetail[]>;
};

function barSizeForDayCount(n: number, stacked: boolean): number {
  const base = stacked ? 4 : 0;
  if (n <= 7) return 28 + base;
  if (n <= 14) return 22 + base;
  if (n <= 30) return 16 + base;
  return 12 + base;
}

function formatDayTitle(dayKey: string): string {
  const [y, m, d] = dayKey.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("es-ES", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDob(iso: string): string {
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

type ShiftSeg = "MANANA" | "TARDE" | "NOCHE";

function topStackSegment(row: DailyShiftRow): ShiftSeg | null {
  if (row.NOCHE > 0) return "NOCHE";
  if (row.TARDE > 0) return "TARDE";
  if (row.MANANA > 0) return "MANANA";
  return null;
}

/** Total encima del tramo superior de la columna (visible aunque noche o tarde sean 0). */
function StackedBarTotalLabel(segment: ShiftSeg) {
  return function Label(props: unknown) {
    const p = props as {
      x?: unknown;
      y?: unknown;
      width?: unknown;
      payload?: DailyShiftRow;
    };
    const row = p.payload;
    if (!row || topStackSegment(row) !== segment) return null;
    const x = Number(p.x);
    const y = Number(p.y);
    const width = Number(p.width);
    const n = row.total;
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(width) || n <= 0) {
      return null;
    }
    return (
      <text
        x={x + width / 2}
        y={y - 6}
        fill="#44403c"
        fontSize={11}
        fontWeight={600}
        textAnchor="middle"
      >
        {n}
      </text>
    );
  };
}

function barClickPayload(data: unknown): DailyShiftRow | undefined {
  const p = data as { payload?: DailyShiftRow };
  return p?.payload;
}

export default function DailyShiftChartClient({ data, finishedByDay }: Props) {
  const [mode, setMode] = useState<"stacked" | "line">("stacked");
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);
  const [portalEl, setPortalEl] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setPortalEl(document.body);
  }, []);

  useEffect(() => {
    if (!selectedDayKey) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedDayKey(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedDayKey]);

  useEffect(() => {
    if (!selectedDayKey) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [selectedDayKey]);

  useEffect(() => {
    setSelectedDayKey(null);
  }, [data, finishedByDay]);

  const handleBarClick = (barData: unknown) => {
    const row = barClickPayload(barData);
    if (row?.dayKey) setSelectedDayKey(row.dayKey);
  };

  if (data.length === 0) {
    return (
      <div className="rounded-2xl border border-stone-200/90 bg-stone-50/90 p-10 text-center text-sm text-stone-500 ring-1 ring-stone-100/80">
        No hay traslados finalizados en el período para mostrar la serie diaria.
      </div>
    );
  }

  const tickAngle = data.length > 14 ? -40 : 0;
  const xHeight = data.length > 14 ? 56 : 32;
  const xInterval = data.length > 40 ? Math.ceil(data.length / 20) : 0;

  const selectedList = selectedDayKey ? finishedByDay[selectedDayKey] ?? [] : [];
  const selectedRow = selectedDayKey ? data.find((r) => r.dayKey === selectedDayKey) : undefined;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-stone-200/90 bg-gradient-to-b from-white to-stone-50/80 p-5 shadow-md shadow-stone-900/[0.05] ring-1 ring-stone-100/80 space-y-4">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-indigo-600 opacity-90" />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-stone-900 sm:text-base">
            Finalizados por día y turno de cierre
          </h2>
          <p className="text-xs text-stone-500 mt-1 max-w-xl leading-relaxed">
            Cada día es <strong>una columna apilada</strong>: abajo mañana, centro tarde, arriba noche
            (colores distintos), según la <strong>hora de finalización</strong> (08–14:59, 15–21:59,
            noche resto), misma regla que en celador. El número encima es el total del día.{" "}
            <strong className="text-stone-800">Pulsa la columna</strong> para abrir el listado en el
            panel lateral. Zona horaria del servidor.
          </p>
        </div>
        <div className="flex shrink-0 rounded-xl border border-stone-200/90 bg-stone-100/80 p-1 shadow-inner">
          <button
            type="button"
            onClick={() => {
              setMode("stacked");
            }}
            className={`rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
              mode === "stacked"
                ? "bg-white text-stone-900 shadow-sm ring-1 ring-stone-200/80"
                : "text-stone-500 hover:text-stone-800"
            }`}
          >
            Barras apiladas
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("line");
              setSelectedDayKey(null);
            }}
            className={`rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
              mode === "line"
                ? "bg-white text-stone-900 shadow-sm ring-1 ring-stone-200/80"
                : "text-stone-500 hover:text-stone-800"
            }`}
          >
            Líneas
          </button>
        </div>
      </div>

      {mode === "line" && (
        <p className="rounded-xl border border-amber-200/80 bg-amber-50/90 px-3 py-2 text-xs text-amber-950">
          En la vista de líneas el detalle por día no está disponible; vuelve a{" "}
          <strong>Barras apiladas</strong> y pulsa una columna.
        </p>
      )}

      <div className="h-[360px] w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          {mode === "stacked" ? (
            <BarChart
              data={data}
              margin={{ top: 28, right: 8, left: 0, bottom: 0 }}
              barCategoryGap="20%"
              barGap={2}
            >
              <CartesianGrid strokeDasharray="4 4" stroke="#e7e5e4" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ ...chartAxisTick, fontSize: 11 }}
                angle={tickAngle}
                textAnchor={tickAngle ? "end" : "middle"}
                height={xHeight}
                interval={xInterval}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ ...chartAxisTick, fontSize: 11 }}
                width={36}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip {...chartTooltipProps} formatter={(value, name) => [`${value ?? 0}`, name]} />
              <Legend wrapperStyle={chartLegendWrapperStyle} />
              {/* Orden apilado: base mañana → tarde → cima noche */}
              <Bar
                dataKey="MANANA"
                name="Mañana"
                stackId="day"
                fill={COL.MANANA}
                radius={[0, 0, 4, 4]}
                barSize={barSizeForDayCount(data.length, true)}
                className="cursor-pointer outline-none"
                onClick={handleBarClick}
              >
                <LabelList dataKey="MANANA" position="top" content={StackedBarTotalLabel("MANANA")} />
              </Bar>
              <Bar
                dataKey="TARDE"
                name="Tarde"
                stackId="day"
                fill={COL.TARDE}
                radius={0}
                barSize={barSizeForDayCount(data.length, true)}
                className="cursor-pointer outline-none"
                onClick={handleBarClick}
              >
                <LabelList dataKey="TARDE" position="top" content={StackedBarTotalLabel("TARDE")} />
              </Bar>
              <Bar
                dataKey="NOCHE"
                name="Noche"
                stackId="day"
                fill={COL.NOCHE}
                radius={[4, 4, 0, 0]}
                barSize={barSizeForDayCount(data.length, true)}
                className="cursor-pointer outline-none"
                onClick={handleBarClick}
              >
                <LabelList dataKey="NOCHE" position="top" content={StackedBarTotalLabel("NOCHE")} />
              </Bar>
            </BarChart>
          ) : (
            <LineChart data={data} margin={{ top: 12, right: 12, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="4 4" stroke="#e7e5e4" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ ...chartAxisTick, fontSize: 11 }}
                angle={tickAngle}
                textAnchor={tickAngle ? "end" : "middle"}
                height={xHeight}
                interval={xInterval}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ ...chartAxisTick, fontSize: 11 }}
                width={36}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip {...chartTooltipProps} formatter={(value, name) => [`${value ?? 0}`, name]} />
              <Legend wrapperStyle={chartLegendWrapperStyle} />
              <Line
                type="monotone"
                dataKey="MANANA"
                name="Mañana"
                stroke={COL.MANANA}
                strokeWidth={2.25}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
              <Line
                type="monotone"
                dataKey="TARDE"
                name="Tarde"
                stroke={COL.TARDE}
                strokeWidth={2.25}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
              <Line
                type="monotone"
                dataKey="NOCHE"
                name="Noche"
                stroke={COL.NOCHE}
                strokeWidth={2.25}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
              <Line
                type="monotone"
                dataKey="total"
                name="Total día"
                stroke={COL.total}
                strokeWidth={2}
                dot={false}
                strokeDasharray="5 5"
                strokeOpacity={0.85}
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>

      {portalEl &&
        selectedDayKey &&
        createPortal(
          <div className="fixed inset-0 z-[200] flex justify-end">
            <button
              type="button"
              className="absolute inset-0 z-0 bg-stone-900/50 backdrop-blur-[2px]"
              aria-label="Cerrar panel"
              onClick={() => setSelectedDayKey(null)}
            />
            <DayFinishedDetailDrawer
              dayKey={selectedDayKey}
              dayTitle={formatDayTitle(selectedDayKey)}
              summaryRow={selectedRow}
              transfers={selectedList}
              onClose={() => setSelectedDayKey(null)}
            />
          </div>,
          portalEl
        )}
    </div>
  );
}
