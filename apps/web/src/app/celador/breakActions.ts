"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { revalidatePath } from "next/cache";
import { breakUsedInCurrentShift, getShift, SHIFT_LABEL, ShiftName } from "@/lib/shifts";
import { emitTransferEvent } from "@/lib/eventBus";
import { Shift } from "@prisma/client";

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

  emitTransferEvent({ type: "celador:break", celadorId });
  revalidatePath("/celador");
}

export async function endBreak() {
  const celadorId = await getCeladorId();

  await prisma.user.update({
    where: { id: celadorId },
    data:  { breakUntil: null },
  });

  emitTransferEvent({ type: "celador:break", celadorId });
  revalidatePath("/celador");
}

/**
 * Permite al propio celador cambiar su turno activo.
 * Al cambiar de turno se resetea el contador de descanso.
 */
export async function setOwnShift(shift: ShiftName | "OFF") {
  const celadorId = await getCeladorId();

  await prisma.user.update({
    where: { id: celadorId },
    data:  {
      activeShift: shift === "OFF" ? null : (shift as Shift),
      breakUsedAt: shift === "OFF" ? undefined : null,
      breakUntil:  shift === "OFF" ? null : undefined,
    },
  });

  emitTransferEvent({ type: "celador:break", celadorId });
  revalidatePath("/celador");
  revalidatePath("/admin");
}
