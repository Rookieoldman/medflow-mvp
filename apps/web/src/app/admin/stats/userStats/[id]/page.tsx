import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function UserStatsPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  // ======================
  // PARAMS (IMPORTANTE)
  // ======================
  const resolvedParams = await Promise.resolve(params as any);
  const userId = resolvedParams?.id;

  if (!userId) {
    return <main className="p-6">Falta el id del usuario</main>;
  }

  // ======================
  // USUARIO
  // ======================
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    return <main className="p-6">Usuario no encontrado</main>;
  }

  const fullName = [user.firstName, user.lastName1, user.lastName2]
    .filter(Boolean)
    .join(" ");

  // ======================
  // TRASLADOS
  // ======================
  const createdTransfers = await prisma.transfer.findMany({
    where: { createdById: userId },
  });

  const assignedTransfers = await prisma.transfer.findMany({
    where: { assignedToId: userId, status: "FINALIZADO" },
  });

  const totalCreated = createdTransfers.length;
  const totalAssigned = assignedTransfers.length;

  const urgentCreated = createdTransfers.filter(
    (t) => t.priority === "URGENTE"
  ).length;

  const avgTimeAssigned =
    totalAssigned === 0
      ? 0
      : Math.round(
          assignedTransfers.reduce((acc, t) => {
            const diff =
              (t.updatedAt.getTime() - t.createdAt.getTime()) / 60000;
            return acc + diff;
          }, 0) / totalAssigned
        );

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayTransfers = assignedTransfers.filter(
    (t) => t.createdAt >= today
  ).length;

  // ======================
  // UI
  // ======================
  return (
    <main className="p-6 space-y-8">
      {/* HEADER */}
      <div className="space-y-1">
        <Link href="/admin/stats" className="underline text-sm">
          ← Volver a estadísticas
        </Link>

        <h1 className="text-2xl font-semibold">
          Stats · {fullName || user.email}
        </h1>

        <p className="text-sm text-gray-500">
          Rol: {user.role} · Estado:{" "}
          {user.active ? "Activo" : "Inactivo"}
        </p>
      </div>

      {/* KPIs */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Kpi label="Solicitudes creadas" value={totalCreated} />
        <Kpi label="Urgentes creadas" value={urgentCreated} />
        <Kpi label="Traslados realizados" value={totalAssigned} />
        <Kpi label="Tiempo medio" value={`${avgTimeAssigned} min`} />
      </section>

      {/* HOY */}
      <section className="border rounded p-4">
        <div className="text-sm text-gray-500">Hoy</div>
        <div className="text-2xl font-semibold">
          {todayTransfers} traslados completados
        </div>
      </section>
    </main>
  );
}

/* ======================
   KPI COMPONENT
====================== */
function Kpi({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="border rounded p-4">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  );
}