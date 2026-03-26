"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { revalidatePath } from "next/cache";
import { breakUsedInCurrentShift, getShift, SHIFT_LABEL } from "@/lib/shifts";

const BREAK_MINUTES = 20;
const MIN_AVAILABLE = 2;

async function getCeladorId() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || (session.user as any).role !== "CELADOR") {
    throw new Error("No autorizado");
  }
  return (session.user as any).id as string;
}

export async function startBreak() {
  const celadorId = await getCeladorId();
  const now       = new Date();

  const user = await prisma.user.findUnique({
    where:  { id: celadorId },
    select: { breakUsedAt: true },
  });

  // Bloquear si ya se usó el descanso en el turno actual
  if (breakUsedInCurrentShift(user?.breakUsedAt ?? null, now)) {
    const shift = getShift(now);
    throw new Error(`Ya has usado el descanso del turno de ${SHIFT_LABEL[shift]}`);
  }

  // Mínimo MIN_AVAILABLE celadores disponibles (sin filtro de turno)
  const availableCount = await prisma.user.count({
    where: {
      id:     { not: celadorId },
      role:   "CELADOR",
      active: true,
      OR: [
        { breakUntil: null },
        { breakUntil: { lte: now } },
      ],
    },
  });

  if (availableCount < MIN_AVAILABLE) {
    throw new Error(
      `No puedes iniciar el descanso: deben quedar al menos ${MIN_AVAILABLE} celadores disponibles`
    );
  }

  const breakUntil = new Date(now.getTime() + BREAK_MINUTES * 60 * 1000);

  await prisma.user.update({
    where: { id: celadorId },
    data:  { breakUntil, breakUsedAt: now },
  });

  revalidatePath("/celador");
}

export async function endBreak() {
  const celadorId = await getCeladorId();

  await prisma.user.update({
    where: { id: celadorId },
    data:  { breakUntil: null },
  });

  revalidatePath("/celador");
}
