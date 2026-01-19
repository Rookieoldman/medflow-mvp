import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminStatsPage() {
  const totalTransfers = await prisma.transfer.count();
  const finishedTransfers = await prisma.transfer.count({
    where: { status: "FINALIZADO" },
  });

  const celadores = await prisma.user.count({
    where: { role: "CELADOR", active: true },
  });

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Estadísticas</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Stat label="Traslados totales" value={totalTransfers} />
        <Stat label="Finalizados" value={finishedTransfers} />
        <Stat label="Celadores activos" value={celadores} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="border rounded p-4">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  );
}