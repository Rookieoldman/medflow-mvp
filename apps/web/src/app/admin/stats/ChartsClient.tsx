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
} from "recharts";

const COLORS = ["#111827", "#374151", "#6B7280", "#9CA3AF"];

function format(data: any[], key: string) {
  return data.map((d) => ({
    name: d[key],
    value: d._count[key],
  }));
}

export default function ChartsClient({
  byStatus,
  byTestType,
  byPriority,
}: any) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* ESTADO */}
      <div className="border rounded p-4">
        <h2 className="font-semibold mb-4">Traslados por estado</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={format(byStatus, "status")}>
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="value" fill="#111827" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* TIPO */}
      <div className="border rounded p-4">
        <h2 className="font-semibold mb-4">Traslados por tipo</h2>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={format(byTestType, "testType")}
              dataKey="value"
              nameKey="name"
              outerRadius={110}
            >
              {byTestType.map((_: any, i: number) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* PRIORIDAD */}
      <div className="border rounded p-4 lg:col-span-2">
        <h2 className="font-semibold mb-4">Prioridad</h2>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={format(byPriority, "priority")}>
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="value" fill="#374151" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}