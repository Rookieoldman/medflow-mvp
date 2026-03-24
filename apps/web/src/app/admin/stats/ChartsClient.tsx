"use client";

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

const PIE_COLORS = [
  "#111827", "#374151", "#6B7280", "#9CA3AF", "#D1D5DB",
];

type DataPoint = { name: string; value: number };

type Props = {
  byStatus:    DataPoint[];
  byTestType:  DataPoint[];
  byPriority:  DataPoint[];
  preFormatted?: boolean;
};

export default function ChartsClient({
  byStatus,
  byTestType,
  byPriority,
}: Props) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* POR TIPO DE PRUEBA */}
      <div className="border rounded-xl p-5 bg-white space-y-4">
        <h2 className="font-semibold text-gray-800">Tipo de prueba</h2>
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

      {/* POR PRIORIDAD */}
      <div className="border rounded-xl p-5 bg-white space-y-4">
        <h2 className="font-semibold text-gray-800">Por prioridad</h2>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={byPriority} barSize={48}>
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
            <Tooltip formatter={(v) => [`${v}`, "Traslados"]} />
            <Bar dataKey="value" fill="#111827" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* POR ESTADO — barra horizontal completa */}
      <div className="border rounded-xl p-5 bg-white space-y-4 lg:col-span-2">
        <h2 className="font-semibold text-gray-800">Evolución por estado</h2>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={byStatus} barSize={32}>
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
            <Tooltip formatter={(v) => [`${v}`, "Traslados"]} />
            <Bar dataKey="value" fill="#374151" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
