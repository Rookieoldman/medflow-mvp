"use client";

import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { chartAxisTick, chartLegendWrapperStyle, chartTooltipProps } from "@/lib/chartTheme";
import type { ExploreTrendsResult, TrendValueKind } from "./trends";

type TrendGranularity = ExploreTrendsResult["granularity"];

const GRAN_LABEL: Record<TrendGranularity, string> = {
  day:   "por día",
  week:  "por semana (inicio lunes)",
  month: "por mes",
};

const VALUE_HINT: Record<TrendValueKind, string> = {
  count:   "Eje vertical: número de casos.",
  minutes: "Eje vertical: minutos (media en el intervalo).",
  percent: "Eje vertical: porcentaje.",
};

function formatTooltipValue(kind: TrendValueKind, v: number | string | undefined): string {
  if (v === null || v === undefined || Number.isNaN(Number(v))) return "—";
  const n = Number(v);
  if (kind === "minutes") return `${n} min`;
  if (kind === "percent") return `${n}%`;
  return String(Math.round(n));
}

type Props = {
  periodLabel: string;
  result:      ExploreTrendsResult;
};

export default function ExploreTrendsChart({ periodLabel, result }: Props) {
  const { granularity, valueKind, metricTitle, metricSubtitle, lines, points } = result;

  const chartRows = useMemo(
    () => points.map((p) => ({ key: p.key, label: p.label, ...p.values })),
    [points]
  );

  if (!points.length || !lines.length) {
    return (
      <div className="rounded-2xl border border-stone-200/90 bg-stone-50/80 p-8 text-center text-sm text-stone-500 ring-1 ring-stone-100/80">
        Sin datos para tendencias en este rango.
      </div>
    );
  }

  const yDecimals = valueKind !== "count";
  const connectNulls = valueKind !== "count";

  return (
    <div className="relative overflow-hidden rounded-2xl border border-stone-200/90 bg-gradient-to-b from-white to-stone-50/90 p-4 shadow-md shadow-stone-900/[0.06] ring-1 ring-stone-100/80 sm:p-5">
      <div className="h-1 w-full rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 opacity-90" />
      <div className="mt-4 space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">{periodLabel}</p>
        <h2 className="text-base font-semibold tracking-tight text-stone-900">{metricTitle}</h2>
        {metricSubtitle ? (
          <p className="mt-2 rounded-xl border border-amber-200/80 bg-amber-50/90 px-3 py-2 text-xs text-amber-950">
            {metricSubtitle}
          </p>
        ) : null}
        <p className="pt-1 text-xs leading-relaxed text-stone-500">
          Agregación {GRAN_LABEL[granularity]}. {VALUE_HINT[valueKind]}
        </p>
      </div>
      <div className="mt-4 h-[min(360px,50vh)] min-h-[280px] w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartRows} margin={{ top: 12, right: 12, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="4 4" stroke="#e7e5e4" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ ...chartAxisTick, fontSize: 10 }}
              interval="preserveStartEnd"
              minTickGap={24}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              allowDecimals={yDecimals}
              tick={{ ...chartAxisTick, fontSize: 11 }}
              width={valueKind === "percent" ? 40 : 44}
              tickFormatter={(v) => (valueKind === "percent" ? `${v}%` : `${v}`)}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              {...chartTooltipProps}
              labelFormatter={(_, p) => {
                const row = p?.[0]?.payload as { key?: string } | undefined;
                return row?.key ?? "";
              }}
              formatter={(value: number | string | undefined, name?: string) => [
                formatTooltipValue(valueKind, value),
                name ?? "",
              ]}
            />
            <Legend wrapperStyle={chartLegendWrapperStyle} />
            {lines.map((ln) => (
              <Line
                key={ln.id}
                type="monotone"
                dataKey={ln.id}
                name={ln.name}
                stroke={ln.color}
                strokeWidth={2.25}
                dot={false}
                activeDot={{ r: 5, strokeWidth: 0 }}
                connectNulls={connectNulls}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
