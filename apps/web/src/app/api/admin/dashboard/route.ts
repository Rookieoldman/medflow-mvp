import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAtRisk } from "@/lib/sla";

export const dynamic = "force-dynamic";

const ACTIVE_STATUSES = ["SOLICITADO", "ASIGNADO", "EN_CURSO", "EN_PRUEBA", "PAUSADO"];

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return new NextResponse("No autorizado", { status: 401 });
  }

  const now        = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [rawTransfers, celadores] = await Promise.all([
    prisma.transfer.findMany({
      where: {
        createdAt: { gte: todayStart },
        status:    { notIn: ["FINALIZADO", "CANCELADO"] },
      },
      select: {
        id:              true,
        patientFullName: true,
        location:        true,
        status:          true,
        createdAt:       true,
        updatedAt:       true,
        priority:        true,
        difficulty:      true,
      },
      orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
    }),
    prisma.user.findMany({
      where:   { role: "CELADOR", active: true },
      select:  { id: true, firstName: true, lastName1: true, email: true, breakUntil: true, activeShift: true },
      orderBy: { firstName: "asc" },
    }),
  ]);

  const transfers = rawTransfers.map((t) => {
    const minutesOpen = Math.floor((now.getTime() - t.createdAt.getTime()) / 60000);
    return {
      ...t,
      atRisk:    isAtRisk(t.status, minutesOpen, t.priority, t.difficulty),
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    };
  });

  const total      = transfers.length;
  const riskCount  = transfers.filter((t) => t.atRisk).length;
  const slaPercent = total > 0 ? Math.round(((total - riskCount) / total) * 100) : 100;

  const statusBreakdown = ACTIVE_STATUSES.map((s) => ({
    status: s,
    count:  transfers.filter((t) => t.status === s).length,
  }));

  const celadorStatus = celadores.map((c) => ({
    id:          c.id,
    name:        [c.firstName, c.lastName1].filter(Boolean).join(" ") || c.email,
    onBreak:     !!(c.breakUntil && c.breakUntil > now),
    breakUntil:  c.breakUntil?.toISOString() ?? null,
    activeShift: c.activeShift ?? null,
  }));

  return NextResponse.json({ transfers, total, riskCount, slaPercent, statusBreakdown, celadores: celadorStatus });
}
