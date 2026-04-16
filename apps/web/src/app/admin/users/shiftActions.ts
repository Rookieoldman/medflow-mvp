"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { revalidatePath } from "next/cache";
import { Shift } from "@prisma/client";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || (session.user as any).role !== "ADMIN") {
    throw new Error("No autorizado");
  }
}

/**
 * Asigna un turno a un celador o técnico.
 * Resetea breakUsedAt para que pueda usar su descanso en el nuevo turno (celadores).
 */
export async function setShift(formData: FormData) {
  await requireAdmin();

  const userId = String(formData.get("userId") ?? "");
  const shift  = String(formData.get("shift")  ?? "") as Shift | "OFF";

  if (!userId) throw new Error("Falta userId");

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  if (target?.role !== "CELADOR" && target?.role !== "TECNICO") {
    throw new Error("El turno solo aplica a celadores o técnicos");
  }

  await prisma.user.update({
    where: { id: userId },
    data:  {
      activeShift: shift === "OFF" ? null : shift as Shift,
      // Al iniciar un nuevo turno, se resetea el descanso
      breakUsedAt: shift === "OFF" ? undefined : null,
      // Si sale de turno, limpiamos también el descanso activo
      breakUntil:  shift === "OFF" ? null : undefined,
    },
  });

  revalidatePath("/admin/users");
  revalidatePath("/admin");
}
