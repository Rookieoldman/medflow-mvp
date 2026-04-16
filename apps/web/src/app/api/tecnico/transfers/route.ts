import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)               return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if ((session.user as any).role !== "TECNICO") return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const [transfers, me] = await Promise.all([
    prisma.transfer.findMany({
      where: {
        createdById: session.user.id,
        status: { notIn: ["FINALIZADO", "CANCELADO"] },
      },
      select: {
        id: true, mrn: true, patientFullName: true, location: true,
        testType: true, priority: true, difficulty: true, status: true,
        createdAt: true,
        assignedTo: {
          select: { id: true, firstName: true, lastName1: true, email: true },
        },
      },
      orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { activeShift: true },
    }),
  ]);

  return NextResponse.json({
    transfers,
    currentShift: me?.activeShift ?? null,
  });
}
