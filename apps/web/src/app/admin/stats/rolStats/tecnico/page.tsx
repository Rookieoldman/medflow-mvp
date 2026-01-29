import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function TecnicoRoleStatsPage() {
  // ======================
  // DATOS BASE
  // ======================
  const transfers = await prisma.transfer.findMany({
    where: {
      createdBy: { role: "TECNICO" },
    },
    include: {
      createdBy: true,
    },
  });

  const total = transfers.length;
  const urgent = transfers.filter((t) => t.priority === "URGENTE").length;

  // ======================
  // RANKING POR TÉCNICO
  // ======================
  const ranking = Object.values(
    transfers.reduce<Record<string, any>>((acc, t) => {
      if (!t.createdBy) return acc;

      const id = t.createdBy.id;

      if (!acc[id]) {
        acc[id] = {
          id,
          name: [t.createdBy.firstName, t.createdBy.lastName1]
            .filter(Boolean)
            .join(" "),
          count: 0,
          urgent: 0,
        };
      }

      acc[id].count++;
      if (t.priority === "URGENTE") acc[id].urgent++;

      return acc;
    }, {})
  );

  ranking.sort((a, b) => b.count - a.count);

  return (
    <main className="p-6 space-y-8">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Stats · Técnicos</h1>

        <div className="flex gap-4 text-sm">
          <Link href="/admin/stats/globalStats" className="underline">
            Global
          </Link>
          <Link href="/admin/stats/rolStats/celador" className="underline">
            Celadores
          </Link>
        </div>
      </div>

      {/* KPIs */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Kpi label="Solicitudes" value={total} />
        <Kpi label="Urgentes" value={urgent} />
        <Kpi
          label="% Urgentes"
          value={total ? `${Math.round((urgent / total) * 100)}%` : "0%"}
        />
      </section>

      {/* RANKING */}
      <section className="border rounded p-4 space-y-4">
        <h2 className="font-semibold">Ranking de técnicos</h2>

        {ranking.length === 0 ? (
          <p className="text-sm text-gray-500">No hay datos aún</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">Técnico</th>
                <th className="text-right p-2">Solicitudes</th>
                <th className="text-right p-2">Urgentes</th>
              </tr>
            </thead>
            <tbody>
              {ranking.map((t) => (
                <tr key={t.id} className="border-b">
                  {/* 👇 NOMBRE CLICKABLE */}
                  <td className="p-2">
                    <Link
                      href={`/admin/stats/userStats/${t.id}`}
                      className="underline hover:text-gray-600 transition"
                    >
                      {t.name || "—"}
                    </Link>
                  </td>
                  <td className="p-2 text-right">{t.count}</td>
                  <td className="p-2 text-right">{t.urgent}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}

/* ======================
   KPI
====================== */
function Kpi({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="border rounded p-4">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  );
}