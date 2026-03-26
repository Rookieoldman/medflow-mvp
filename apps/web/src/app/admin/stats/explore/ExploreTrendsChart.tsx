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
      <div className="border border-gray-200 rounded-xl bg-white p-6 text-sm text-gray-400">
        Sin datos para tendencias en este rango.
      </div>
    );
  }

  const yDecimals = valueKind !== "count";
  const connectNulls = valueKind !== "count";

  return (
    <div className="border border-gray-200 rounded-xl bg-white p-4 sm:p-5 space-y-3">
      <div>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{periodLabel}</p>
        <h2 className="text-sm font-semibold text-gray-900 mt-0.5">{metricTitle}</h2>
        {metricSubtitle ? (
          <p className="text-xs text-amber-800/90 bg-amber-50 border border-amber-100 rounded-lg px-2 py-1.5 mt-2">
            {metricSubtitle}
          </p>
        ) : null}
        <p className="text-xs text-gray-500 mt-2">
          Agregación {GRAN_LABEL[granularity]}. {VALUE_HINT[valueKind]}
        </p>
      </div>
      <div className="h-[min(360px,50vh)] min-h-[280px] w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartRows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-gray-100" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10 }}
              interval="preserveStartEnd"
              minTickGap={24}
            />
            <YAxis
              allowDecimals={yDecimals}
              tick={{ fontSize: 11 }}
              width={valueKind === "percent" ? 40 : 44}
              tickFormatter={(v) => (valueKind === "percent" ? `${v}%` : `${v}`)}
            />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 8 }}
              labelFormatter={(_, p) => {
                const row = p?.[0]?.payload as { key?: string } | undefined;
                return row?.key ?? "";
              }}
              formatter={(value: number | string | undefined, name?: string) => [
                formatTooltipValue(valueKind, value),
                name ?? "",
              ]}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {lines.map((ln) => (
              <Line
                key={ln.id}
                type="monotone"
                dataKey={ln.id}
                name={ln.name}
                stroke={ln.color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
                connectNulls={connectNulls}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
