"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { revalidatePath } from "next/cache";
import { Shift } from "@prisma/client";

const VALID_SHIFTS: ReadonlyArray<Shift | "OFF"> = ["MANANA", "TARDE", "NOCHE", "OFF"];

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || (session.user as any).role !== "ADMIN") {
    throw new Error("No autorizado");
  }
  return session.user as { id: string; firstName?: string; lastName1?: string; email: string };
}

/**
 * Asigna un turno a un celador o técnico.
 * Resetea breakUsedAt para que pueda usar su descanso en el nuevo turno (celadores).
 */
export async function setShift(formData: FormData) {
  const admin = await requireAdmin();

  const userId = String(formData.get("userId") ?? "");
  const shift  = String(formData.get("shift")  ?? "") as Shift | "OFF";

  if (!userId) throw new Error("Falta userId");
  if (!VALID_SHIFTS.includes(shift)) throw new Error("Turno no válido");

  const target = await prisma.user.findUnique({
    where:  { id: userId },
    select: { role: true, activeShift: true },
  });
  if (target?.role !== "CELADOR" && target?.role !== "TECNICO") {
    throw new Error("El turno solo aplica a celadores o técnicos");
  }

  const newShift = shift === "OFF" ? null : shift as Shift;

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data:  {
        activeShift: newShift,
        breakUsedAt: newShift === null ? undefined : null,
        breakUntil:  newShift === null ? null : undefined,
      },
    }),
    prisma.shiftChangeLog.create({
      data: {
        userId,
        fromShift:     target.activeShift ?? null,
        toShift:       newShift,
        changedByRole: "ADMIN",
        changedByName: (admin as any).firstName
          ? `${(admin as any).firstName} ${(admin as any).lastName1 ?? ""}`.trim()
          : (admin as any).email,
      },
    }),
  ]);

  revalidatePath("/admin/users");
  revalidatePath("/admin");
}
