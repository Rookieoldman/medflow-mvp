"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { Shift } from "@prisma/client";
import { emitTransferEvent } from "@/lib/eventBus";
import type { ShiftName } from "@/lib/shifts";

/** Celador o técnico: actualiza su turno declarado (misma lógica que antes solo para celador). */
export async function setOwnShift(shift: ShiftName | "OFF") {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string })?.role;
  const userId = session?.user?.id;
  if (!userId || (role !== "CELADOR" && role !== "TECNICO")) {
    throw new Error("No autorizado");
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      activeShift: shift === "OFF" ? null : (shift as Shift),
      breakUsedAt: shift === "OFF" ? undefined : null,
      breakUntil: shift === "OFF" ? null : undefined,
    },
  });

  emitTransferEvent({ type: "staff:shift", staffUserId: userId });
  revalidatePath("/celador");
  revalidatePath("/tecnico");
  revalidatePath("/admin");
  revalidatePath("/admin/users");
}
