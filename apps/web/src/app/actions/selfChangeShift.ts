"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { revalidatePath } from "next/cache";
import { Shift } from "@prisma/client";

const VALID_SHIFTS: Array<Shift | "OFF"> = ["MANANA", "TARDE", "NOCHE", "OFF"];

export async function selfChangeShift(formData: FormData) {
  const session = await getServerSession(authOptions);
  const user    = session?.user as any;

  if (!user?.id || (user.role !== "CELADOR" && user.role !== "TECNICO")) {
    throw new Error("No autorizado");
  }

  const shift = String(formData.get("shift") ?? "") as Shift | "OFF";
  if (!VALID_SHIFTS.includes(shift)) throw new Error("Turno no válido");

  const current = await prisma.user.findUnique({
    where:  { id: user.id },
    select: { activeShift: true },
  });

  const newShift = shift === "OFF" ? null : (shift as Shift);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data:  {
        activeShift: newShift,
        breakUsedAt: newShift === null ? undefined : null,
        breakUntil:  newShift === null ? null : undefined,
      },
    }),
    prisma.shiftChangeLog.create({
      data: {
        userId:        user.id,
        fromShift:     current?.activeShift ?? null,
        toShift:       newShift,
        changedByRole: "SELF",
        changedByName: user.firstName
          ? `${user.firstName} ${user.lastName1 ?? ""}`.trim()
          : user.email,
      },
    }),
  ]);

  revalidatePath("/celador");
  revalidatePath("/tecnico");
  revalidatePath("/admin");
}
