import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getShift } from "@/lib/shifts";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return new NextResponse("No autorizado", { status: 401 });
  }

  const now          = new Date();
  const currentShift = getShift(now);

  const celadores = await prisma.user.findMany({
    where:   { role: "CELADOR", active: true, activeShift: currentShift },
    select:  { id: true, firstName: true, lastName1: true, email: true, breakUntil: true, activeShift: true },
    orderBy: { firstName: "asc" },
  });

  const data = celadores.map((c) => ({
    id:          c.id,
    name:        [c.firstName, c.lastName1].filter(Boolean).join(" ") || c.email,
    onBreak:     !!(c.breakUntil && c.breakUntil > now),
    breakUntil:  c.breakUntil?.toISOString() ?? null,
    activeShift: c.activeShift ?? null,
  }));

  return NextResponse.json(data);
}
