import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAtRisk } from "@/lib/sla";
import { getShift } from "@/lib/shifts";

export const dynamic = "force-dynamic";

const ACTIVE_STATUSES = ["SOLICITADO", "ASIGNADO", "EN_CURSO", "EN_PRUEBA", "PAUSADO"];

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return new NextResponse("No autorizado", { status: 401 });
  }

  const now          = new Date();
  const currentShift = getShift(now);

  const staffSelect = { id: true, firstName: true, lastName1: true, email: true, breakUntil: true, activeShift: true } as const;

  const [rawTransfers, celadores, tecnicos] = await Promise.all([
    prisma.transfer.findMany({
      where: {
        status: { notIn: ["FINALIZADO", "CANCELADO"] },
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
      where:   { role: "CELADOR", active: true, activeShift: currentShift },
      select:  staffSelect,
      orderBy: { firstName: "asc" },
    }),
    prisma.user.findMany({
      where:   { role: "TECNICO", active: true, activeShift: currentShift },
      select:  staffSelect,
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

  const toStaff = (role: string) => (u: typeof celadores[number]) => ({
    id:          u.id,
    name:        [u.firstName, u.lastName1].filter(Boolean).join(" ") || u.email,
    role,
    onBreak:     !!(u.breakUntil && u.breakUntil > now),
    breakUntil:  u.breakUntil?.toISOString() ?? null,
    activeShift: u.activeShift ?? null,
  });

  const staff = [
    ...celadores.map(toStaff("CELADOR")),
    ...tecnicos.map(toStaff("TECNICO")),
  ];

  return NextResponse.json({ transfers, total, riskCount, slaPercent, statusBreakdown, staff });
}
