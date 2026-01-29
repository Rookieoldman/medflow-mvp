import { prisma } from "@/lib/prisma";
import ChartsClient from "./ChartsClient";

export const dynamic = "force-dynamic";

export default async function AdminStatsPage() {
  // Traslados por estado
  const byStatus = await prisma.transfer.groupBy({
    by: ["status"],
    _count: { status: true },
  });

  // Traslados por tipo de prueba
  const byTestType = await prisma.transfer.groupBy({
    by: ["testType"],
    _count: { testType: true },
  });

  // Traslados por prioridad
  const byPriority = await prisma.transfer.groupBy({
    by: ["priority"],
    _count: { priority: true },
  });

  return (
    <main className="p-6 space-y-8">
      <h1 className="text-2xl font-semibold">Estadísticas</h1>

      <ChartsClient
        byStatus={byStatus}
        byTestType={byTestType}
        byPriority={byPriority}
      />
    </main>
  );
}