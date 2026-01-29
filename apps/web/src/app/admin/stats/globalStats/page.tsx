import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function GlobalStatsPage() {
  // ======================
  // KPIs GENERALES
  // ======================
  const [
    totalTransfers,
    urgentTransfers,
    todayTransfers,
    finishedTransfers,
  ] = await Promise.all([
    prisma.transfer.count(),
    prisma.transfer.count({
      where: { priority: "URGENTE" },
    }),
    prisma.transfer.count({
      where: {
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
    }),
    prisma.transfer.findMany({
      where: { status: "FINALIZADO" },
      select: { createdAt: true, updatedAt: true },
    }),
  ]);

  // ⏱️ Tiempo medio (minutos)
  const avgTimeMinutes =
    finishedTransfers.length === 0
      ? 0
      : Math.round(
          finishedTransfers.reduce((acc, t) => {
            const diff =
              (t.updatedAt.getTime() - t.createdAt.getTime()) / 60000;
            return acc + diff;
          }, 0) / finishedTransfers.length
        );

  // ======================
  // DISTRIBUCIONES
  // ======================
  const byStatus = await prisma.transfer.groupBy({
    by: ["status"],
    _count: true,
  });

  const byTestType = await prisma.transfer.groupBy({
    by: ["testType"],
    _count: true,
  });

  return (
    <main className="p-6 space-y-8">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Stats · Global</h1>

        <div className="flex gap-4 text-sm">
          <Link href="/admin/stats/globalStats" className="underline">
            Global
          </Link>
          <Link href="/admin/stats/rolStats/celador" className="underline">
            Celadores
          </Link>
          <Link href="/admin/stats/rolStats/tecnico" className="underline">
            Técnicos
          </Link>
        </div>
      </div>

      {/* ======================
          KPIs
      ======================= */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Kpi label="Total traslados" value={totalTransfers} />
        <Kpi label="Urgentes" value={urgentTransfers} />
        <Kpi label="Hoy" value={todayTransfers} />
        <Kpi label="Tiempo medio" value={`${avgTimeMinutes} min`} />
      </section>

      {/* ======================
          DISTRIBUCIONES
      ======================= */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Por estado */}
        <div className="border rounded p-4 space-y-3">
          <h2 className="font-semibold">Traslados por estado</h2>
          <ul className="text-sm space-y-1">
            {byStatus.map((s) => (
              <li key={s.status} className="flex justify-between">
                <span>{s.status}</span>
                <span>{s._count}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Por tipo */}
        <div className="border rounded p-4 space-y-3">
          <h2 className="font-semibold">Traslados por tipo</h2>
          <ul className="text-sm space-y-1">
            {byTestType.map((t) => (
              <li key={t.testType} className="flex justify-between">
                <span>{t.testType}</span>
                <span>{t._count}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}

/* ======================
   COMPONENTE KPI
====================== */
function Kpi({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="border rounded p-4">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  );
}