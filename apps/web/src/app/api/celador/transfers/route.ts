import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  if (session.user.role !== "CELADOR") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const celadorId = session.user.id;

  /* ===========================
     TRASLADOS DISPONIBLES
     - NO asignados
     - NO cancelados
     - NO finalizados
  ============================ */
  const available = await prisma.transfer.findMany({
    where: {
      assignedToId: null,
      status: {
        notIn: ["CANCELADO", "FINALIZADO"],
      },
    },
    orderBy: [
      { priority: "desc" }, // urgentes primero
      { createdAt: "asc" },
    ],
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
        notIn: ["CANCELADO", "FINALIZADO"],
      },
    },
    orderBy: [
      { priority: "desc" },
      { createdAt: "asc" },
    ],
    include: {
      acceptance: true,
    },
  });

  return NextResponse.json({ available, mine });
}