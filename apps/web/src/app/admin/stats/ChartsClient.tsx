"use client";

import type { ReactNode } from "react";
import { useId } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  CartesianGrid,
} from "recharts";
import { exploreUrl, type ExploreDim } from "@/lib/statsExplore";
import type { StatsScopeKey } from "@/lib/adminStatsPeriod";
import { chartAxisTick, chartLegendWrapperStyle, chartTooltipProps } from "@/lib/chartTheme";

const TEST_TYPE_COLOR: Record<string, string> = {
  RM: "#7c3aed",
  ECO: "#0284c7",
  RX: "#475569",
  TC: "#0d9488",
  MEDICINA_NUCLEAR: "#c026d3",
};

const PRIORITY_COLOR: Record<string, string> = {
  URGENTE: "#e11d48",
  NORMAL: "#64748b",
};

const PIE_FALLBACK = ["#6366f1", "#8b5cf6", "#a78bfa", "#c4b5fd", "#e9d5ff"];

export type ChartDatum = { name: string; value: number; rawVal?: string };

/** Filas para barras apiladas ámbito × prioridad (creados en período). */
export type ScopePriorityChartRow = {
  name: string;
  scopeRaw: string;
  NORMAL: number;
  URGENTE: number;
};

type ExploreCtx = { from: string; to: string; scope: StatsScopeKey };

type Props = {
  scopePriorityChart: ScopePriorityChartRow[];
  byTestType: ChartDatum[];
  byPriority: ChartDatum[];
  preFormatted?: boolean;
  explore?: ExploreCtx;
};

function pieFill(d: ChartDatum, index: number): string {
  if (d.rawVal && TEST_TYPE_COLOR[d.rawVal]) return TEST_TYPE_COLOR[d.rawVal];
  return PIE_FALLBACK[index % PIE_FALLBACK.length];
}

function barFillPriority(raw?: string): string {
  if (raw && PRIORITY_COLOR[raw]) return PRIORITY_COLOR[raw];
  return "#64748b";
}

function ChartShell({
  accentClass,
  title,
  subtitle,
  children,
}: {
  accentClass: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="relative flex flex-col overflow-hidden rounded-2xl border border-stone-200/90 bg-gradient-to-b from-white to-stone-50/90 shadow-md shadow-stone-900/[0.06] ring-1 ring-stone-100/80">
      <div className={`h-1 w-full shrink-0 bg-gradient-to-r ${accentClass}`} aria-hidden />
      <div className="space-y-1 px-5 pt-4">
        <h2 className="text-sm font-semibold tracking-tight text-stone-900">{title}</h2>
        {subtitle ? (
          <p className="text-[11px] leading-relaxed text-stone-500">{subtitle}</p>
        ) : null}
      </div>
      <div className="min-h-0 flex-1 px-3 pb-4 pt-2 sm:px-5">{children}</div>
    </div>
  );
}

export default function ChartsClient({
  scopePriorityChart,
  byTestType,
  byPriority,
  explore,
  preFormatted: _preFormatted,
}: Props) {
  void _preFormatted;
  const router = useRouter();
  const pieShadowId = useId().replace(/:/g, "");

  function goSlice(dim: ExploreDim, val: string) {
    if (!explore) return;
    router.push(
      exploreUrl({
        view: "slice",
        dim,
        val,
        from: explore.from,
        to: explore.to,
        scope: explore.scope,
      })
    );
  }

  function handleScopeStackClick(barData: unknown) {
    const payload = (barData as { payload?: ScopePriorityChartRow }).payload;
    if (payload?.scopeRaw) goSlice("scope", payload.scopeRaw);
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <ChartShell
        accentClass="from-violet-500 via-indigo-500 to-blue-500"
        title="Tipo de prueba"
        subtitle={
          explore
            ? "Distribución en el período. Clic en un sector para abrir el detalle."
            : "Distribución de traslados creados en el período."
        }
      >
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <defs>
              <filter id={pieShadowId} x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#0f172a" floodOpacity="0.12" />
              </filter>
            </defs>
            <Pie
              data={byTestType}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={58}
              outerRadius={92}
              paddingAngle={2.5}
              stroke="#fff"
              strokeWidth={2}
              style={{ filter: `url(#${pieShadowId})` }}
              label={({ name, percent }) =>
                (percent ?? 0) >= 0.06 ? `${name} ${((percent ?? 0) * 100).toFixed(0)}%` : ""
              }
              labelLine={false}
              cursor={explore ? "pointer" : "default"}
              onClick={(_, index) => {
                const raw = byTestType[index]?.rawVal;
                if (raw) goSlice("testType", raw);
              }}
            >
              {byTestType.map((d, i) => (
                <Cell key={`${d.rawVal ?? d.name}-${i}`} fill={pieFill(d, i)} />
              ))}
            </Pie>
            <Tooltip
              {...chartTooltipProps}
              formatter={(v: number | string | undefined) => [`${v ?? 0}`, "Traslados"]}
            />
            <Legend wrapperStyle={chartLegendWrapperStyle} />
          </PieChart>
        </ResponsiveContainer>
      </ChartShell>

      <ChartShell
        accentClass="from-rose-400 via-orange-400 to-amber-400"
        title="Prioridad"
        subtitle={explore ? "Comparativa normal vs urgente. Clic en una barra para el detalle." : ""}
      >
        <ResponsiveContainer width="100%" height={280}>
          <BarChart
            data={byPriority}
            margin={{ top: 12, right: 8, left: -8, bottom: 4 }}
            onClick={(e: unknown) => {
              const p = (e as { activePayload?: { payload?: ChartDatum }[] })?.activePayload?.[0]
                ?.payload;
              if (p?.rawVal) goSlice("priority", p.rawVal);
            }}
          >
            <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e7e5e4" />
            <XAxis dataKey="name" tick={chartAxisTick} axisLine={false} tickLine={false} dy={4} />
            <YAxis
              allowDecimals={false}
              tick={chartAxisTick}
              width={36}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              {...chartTooltipProps}
              formatter={(v) => [`${v ?? 0}`, "Traslados"]}
              cursor={{ fill: "rgb(245 245 244 / 0.85)", radius: 8 }}
            />
            <Bar dataKey="value" radius={[10, 10, 4, 4]} barSize={44} cursor={explore ? "pointer" : "default"}>
              {byPriority.map((e, i) => (
                <Cell key={e.rawVal ?? i} fill={barFillPriority(e.rawVal)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartShell>

      <div className="lg:col-span-2">
        <ChartShell
          accentClass="from-sky-500 via-cyan-500 to-teal-500"
          title="Ámbito y prioridad"
          subtitle={
            explore
              ? "Creados en el período: cuántos son normales vs urgentes en Planta y Urgencias. Clic en un tramo para abrir el listado filtrado por ámbito."
              : "Distribución de creados por ámbito y prioridad."
          }
        >
          {scopePriorityChart.length === 0 ? (
            <p className="py-10 text-center text-sm text-stone-500">
              Sin datos de ámbito en este período o filtro.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={scopePriorityChart}
                margin={{ top: 12, right: 12, left: -4, bottom: 8 }}
              >
                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e7e5e4" />
                <XAxis
                  dataKey="name"
                  tick={chartAxisTick}
                  axisLine={false}
                  tickLine={false}
                  dy={6}
                />
                <YAxis
                  allowDecimals={false}
                  tick={chartAxisTick}
                  width={36}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  {...chartTooltipProps}
                  formatter={(v: number | string | undefined, name: string | undefined) => [
                    `${v ?? 0}`,
                    name === "NORMAL" ? "Normal" : name === "URGENTE" ? "Urgente" : (name ?? ""),
                  ]}
                  cursor={{ fill: "rgb(245 245 244 / 0.85)", radius: 8 }}
                />
                <Legend
                  wrapperStyle={chartLegendWrapperStyle}
                  formatter={(value) =>
                    value === "NORMAL" ? "Normal" : value === "URGENTE" ? "Urgente" : String(value)
                  }
                />
                <Bar
                  dataKey="NORMAL"
                  name="NORMAL"
                  stackId="sp"
                  fill={PRIORITY_COLOR.NORMAL}
                  radius={[0, 0, 6, 6]}
                  maxBarSize={56}
                  className={explore ? "cursor-pointer outline-none" : ""}
                  onClick={explore ? handleScopeStackClick : undefined}
                />
                <Bar
                  dataKey="URGENTE"
                  name="URGENTE"
                  stackId="sp"
                  fill={PRIORITY_COLOR.URGENTE}
                  radius={[6, 6, 0, 0]}
                  maxBarSize={56}
                  className={explore ? "cursor-pointer outline-none" : ""}
                  onClick={explore ? handleScopeStackClick : undefined}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartShell>
      </div>
    </div>
  );
}
