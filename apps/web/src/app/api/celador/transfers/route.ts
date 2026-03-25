import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || session.user.role !== "CELADOR") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const celadorId = session.user.id;

  /* Estado de descanso del celador */
  const now     = new Date();
  const celador = await prisma.user.findUnique({
    where:  { id: celadorId },
    select: { breakUntil: true, breakUsedAt: true },
  });
  const onBreak      = !!(celador?.breakUntil && celador.breakUntil > now);
  const breakUntil   = onBreak ? celador!.breakUntil!.toISOString() : null;
  const breakAvailable = !(
    celador?.breakUsedAt &&
    celador.breakUsedAt.getFullYear() === now.getFullYear() &&
    celador.breakUsedAt.getMonth()    === now.getMonth()    &&
    celador.breakUsedAt.getDate()     === now.getDate()
  );

  /* ===========================
     TRASLADOS DISPONIBLES
     - NO asignados
     - SOLO solicitados
  ============================ */
  const available = await prisma.transfer.findMany({
    where: {
      assignedToId: null,
      status: "SOLICITADO",
    },
    orderBy: [
      { priority: "desc" },
      { createdAt: "asc" },
    ],
    select: {
      id: true,
      mrn: true,
      patientFullName: true,
      location: true,
      testType: true,
      priority: true,
      status: true,
      difficulty: true,
      createdAt: true,
      requiresAcceptance: true,
    },
  });

  /* ===========================
     MIS TRASLADOS
     - asignados a mí
     - activos
  ============================ */
  const mine = await prisma.transfer.findMany({
    where: {
      assignedToId: celadorId,
      status: {
        notIn: ["FINALIZADO", "CANCELADO"],
      },
    },
    orderBy: [
      { priority: "desc" },
      { createdAt: "asc" },
    ],
    select: {
      id: true,
      mrn: true,
      patientFullName: true,
      location: true,
      testType: true,
      priority: true,
      status: true,
      difficulty: true,
      createdAt: true,
      requiresAcceptance: true,
    },
  });

  return NextResponse.json({ available, mine, onBreak, breakUntil, breakAvailable });
}