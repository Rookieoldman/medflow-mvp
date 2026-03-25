"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { revalidatePath } from "next/cache";

const BREAK_MINUTES = 20;

async function getCeladorId() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || (session.user as any).role !== "CELADOR") {
    throw new Error("No autorizado");
  }
  return (session.user as any).id as string;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth()    === b.getMonth()    &&
    a.getDate()     === b.getDate()
  );
}

export async function startBreak() {
  const celadorId = await getCeladorId();

  const user = await prisma.user.findUnique({
    where:  { id: celadorId },
    select: { breakUsedAt: true },
  });

  if (user?.breakUsedAt && isSameDay(user.breakUsedAt, new Date())) {
    throw new Error("Ya has usado el descanso de hoy");
  }

  const now        = new Date();
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
