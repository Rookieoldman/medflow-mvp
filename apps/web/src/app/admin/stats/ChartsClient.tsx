"use client";

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
} from "recharts";
import { exploreUrl, type ExploreDim } from "@/lib/statsExplore";
import type { StatsScopeKey } from "@/lib/adminStatsPeriod";

const PIE_COLORS = [
  "#111827", "#374151", "#6B7280", "#9CA3AF", "#D1D5DB",
];

export type ChartDatum = { name: string; value: number; rawVal?: string };

type ExploreCtx = { from: string; to: string; scope: StatsScopeKey };

type Props = {
  byStatus:    ChartDatum[];
  byTestType:  ChartDatum[];
  byPriority:  ChartDatum[];
  preFormatted?: boolean;
  /** Si se indica, clic en segmentos abre el explorador con vista detalle */
  explore?: ExploreCtx;
};

export default function ChartsClient({
  byStatus,
  byTestType,
  byPriority,
  explore,
}: Props) {
  const router = useRouter();

  function goSlice(dim: ExploreDim, val: string) {
    if (!explore) return;
    router.push(
      exploreUrl({
        view:  "slice",
        dim,
        val,
        from:  explore.from,
        to:    explore.to,
        scope: explore.scope,
      })
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="border rounded-xl p-5 bg-white space-y-4">
        <h2 className="font-semibold text-gray-800">Tipo de prueba</h2>
        <p className="text-xs text-gray-400">
          {explore ? "Clic en un sector para ver el listado." : ""}
        </p>
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie
              data={byTestType}
              dataKey="value"
              nameKey="name"
              outerRadius={90}
              paddingAngle={2}
              label={({ name, percent }) =>
                `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
              }
              labelLine={false}
              cursor={explore ? "pointer" : "default"}
              onClick={(_, index) => {
                const raw = byTestType[index]?.rawVal;
                if (raw) goSlice("testType", raw);
              }}
            >
              {byTestType.map((_, i) => (
                <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(v) => [`${v}`, "Traslados"]} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="border rounded-xl p-5 bg-white space-y-4">
        <h2 className="font-semibold text-gray-800">Por prioridad</h2>
        <p className="text-xs text-gray-400">{explore ? "Clic en una barra." : ""}</p>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart
            data={byPriority}
            barSize={48}
            onClick={(e: unknown) => {
              const p = (e as { activePayload?: { payload?: ChartDatum }[] })?.activePayload?.[0]
                ?.payload;
              if (p?.rawVal) goSlice("priority", p.rawVal);
            }}
          >
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
            <Tooltip formatter={(v) => [`${v}`, "Traslados"]} />
            <Bar
              dataKey="value"
              fill="#111827"
              radius={[4, 4, 0, 0]}
              cursor={explore ? "pointer" : "default"}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="border rounded-xl p-5 bg-white space-y-4 lg:col-span-2">
        <h2 className="font-semibold text-gray-800">Por estado</h2>
        <p className="text-xs text-gray-400">{explore ? "Clic en una barra." : ""}</p>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart
            data={byStatus}
            barSize={32}
            onClick={(e: unknown) => {
              const p = (e as { activePayload?: { payload?: ChartDatum }[] })?.activePayload?.[0]
                ?.payload;
              if (p?.rawVal) goSlice("status", p.rawVal);
            }}
          >
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
            <Tooltip formatter={(v) => [`${v}`, "Traslados"]} />
            <Bar
              dataKey="value"
              fill="#374151"
              radius={[4, 4, 0, 0]}
              cursor={explore ? "pointer" : "default"}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
