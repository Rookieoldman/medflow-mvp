import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  if (session.user.role !== "TECNICO") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const transfers = await prisma.transfer.findMany({
    where: {
      createdById: session.user.id,
      status: { not: "FINALIZADO" },
    },
    orderBy: [
      { priority: "desc" },
      { createdAt: "asc" },
    ],
  });

  return NextResponse.json(transfers);
}