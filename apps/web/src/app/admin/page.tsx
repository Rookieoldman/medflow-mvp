import { prisma } from "@/lib/prisma";
import DashboardClient from "./DashboardClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const ACTIVE_STATUSES = ["SOLICITADO", "ASIGNADO", "EN_CURSO", "EN_PRUEBA", "PAUSADO"];

function isAtRisk(status: string, minutesOpen: number, priority: string) {
  if (priority === "URGENTE" && minutesOpen > 5) return true;
  if (status === "SOLICITADO" && minutesOpen > 15) return true;
  if (status === "ASIGNADO" && minutesOpen > 10) return true;
  if (status === "EN_CURSO" && minutesOpen > 30) return true;
  if (status === "EN_PRUEBA" && minutesOpen > 60) return true;
  if (status === "PAUSADO" && minutesOpen > 15) return true;
  return false;
}

export default async function AdminDashboardPage() {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const raw = await prisma.transfer.findMany({
    where: {
      createdAt: { gte: todayStart },
      status: { notIn: ["FINALIZADO", "CANCELADO"] },
    },
    select: {
      id: true,
      patientFullName: true,
      location: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      priority: true,
    },
    orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
  });

  const transfers = raw.map((t) => {
    const minutesOpen = Math.floor((Date.now() - t.createdAt.getTime()) / 60000);
    return {
      ...t,
      atRisk: isAtRisk(t.status, minutesOpen, t.priority),
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    };
  });

  const total = transfers.length;
  const riskCount = transfers.filter((t) => t.atRisk).length;
  const slaPercent = total > 0 ? Math.round(((total - riskCount) / total) * 100) : 100;

  const statusBreakdown = ACTIVE_STATUSES.map((s) => ({
    status: s,
    count: transfers.filter((t) => t.status === s).length,
  }));

  return (
    <DashboardClient
      transfers={transfers}
      total={total}
      riskCount={riskCount}
      slaPercent={slaPercent}
      statusBreakdown={statusBreakdown}
    />
  );
}