import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CeladorRoleStatsPage() {
  // ======================
  // KPIs GENERALES CELADORES
  // ======================
  const transfers = await prisma.transfer.findMany({
    where: { status: "FINALIZADO" },
    include: {
      assignedTo: true,
    },
  });

  const total = transfers.length;
  const urgent = transfers.filter((t) => t.priority === "URGENTE").length;

  const avgTime =
    total === 0
      ? 0
      : Math.round(
          transfers.reduce((acc, t) => {
            const diff =
              (t.updatedAt.getTime() - t.createdAt.getTime()) / 60000;
            return acc + diff;
          }, 0) / total,
        );

  const today = transfers.filter((t) => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    return t.createdAt >= todayStart;
  }).length;

  // ======================
  // RANKING POR CELADOR
  // ======================
  const ranking = Object.values(
    transfers.reduce<Record<string, any>>((acc, t) => {
      if (!t.assignedTo) return acc;

      const id = t.assignedTo.id;
      if (!acc[id]) {
        acc[id] = {
          id,
          name: [t.assignedTo.firstName, t.assignedTo.lastName1]
            .filter(Boolean)
            .join(" "),
          count: 0,
          totalTime: 0,
        };
      }

      acc[id].count++;
      acc[id].totalTime +=
        (t.updatedAt.getTime() - t.createdAt.getTime()) / 60000;

      return acc;
    }, {}),
  ).map((c) => ({
    ...c,
    avgTime: Math.round(c.totalTime / c.count),
  }));

  ranking.sort((a, b) => b.count - a.count);

  return (
    <main className="p-6 space-y-8">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Stats · Celadores</h1>

        <div className="flex gap-4 text-sm">
          <Link href="/admin/stats/globalStats" className="underline">
            Global
          </Link>
          <Link href="/admin/stats/rolStats/tecnico" className="underline">
            Técnicos
          </Link>
        </div>
      </div>

      {/* KPIs */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Kpi label="Traslados" value={total} />
        <Kpi label="Urgentes" value={urgent} />
        <Kpi label="Hoy" value={today} />
        <Kpi label="Tiempo medio" value={`${avgTime} min`} />
      </section>

      {/* RANKING */}
      <section className="border rounded p-4 space-y-4">
        <h2 className="font-semibold">Ranking de celadores</h2>

        {ranking.length === 0 ? (
          <p className="text-sm text-gray-500">No hay datos aún</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">Celador</th>
                <th className="text-right p-2">Traslados</th>
                <th className="text-right p-2">Tiempo medio</th>
              </tr>
            </thead>
            <tbody>
              {ranking.map((c) => (
                <tr key={c.id} className="border-b">
                  <td className="p-2">
                    <Link
                      href={`/admin/stats/userStats/${c.id}`}
                      className="underline hover:text-gray-600 transition"
                    >
                      {c.name || "—"}
                    </Link>
                  </td>
                  <td className="p-2 text-right">{c.count}</td>
                  <td className="p-2 text-right">{c.avgTime} min</td>
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
