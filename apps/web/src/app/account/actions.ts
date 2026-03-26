"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

const MIN_LEN = 8;

export type ChangePasswordState = {
  error: string | null;
  ok:    boolean;
};

export async function changePassword(
  _prev: ChangePasswordState,
  formData: FormData
): Promise<ChangePasswordState> {
  const session = await getServerSession(authOptions);
  const userId    = session?.user?.id;
  if (!userId) {
    return { error: "No hay sesión activa", ok: false };
  }

  const current = String(formData.get("currentPassword") ?? "");
  const next    = String(formData.get("newPassword") ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");

  if (!current || !next || !confirm) {
    return { error: "Completa todos los campos", ok: false };
  }

  if (next.length < MIN_LEN) {
    return { error: `La nueva contraseña debe tener al menos ${MIN_LEN} caracteres`, ok: false };
  }

  if (next !== confirm) {
    return { error: "La confirmación no coincide con la nueva contraseña", ok: false };
  }

  if (next === current) {
    return { error: "La nueva contraseña debe ser distinta de la actual", ok: false };
  }

  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: { password: true, active: true },
  });

  if (!user?.active) {
    return { error: "Cuenta no disponible", ok: false };
  }

  const valid = await bcrypt.compare(current, user.password);
  if (!valid) {
    return { error: "La contraseña actual no es correcta", ok: false };
  }

  const hash = await bcrypt.hash(next, 10);
  await prisma.user.update({
    where: { id: userId },
    data:  { password: hash },
  });

  return { error: null, ok: true };
}
