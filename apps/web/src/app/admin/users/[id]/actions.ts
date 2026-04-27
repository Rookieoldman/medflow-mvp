"use server";

import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import bcrypt from "bcryptjs";

const PASSWORD_MIN_LEN = 8;

const VALID_ROLES = ["TECNICO", "CELADOR", "ADMIN"] as const;
type Role = (typeof VALID_ROLES)[number];

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "ADMIN") {
    throw new Error("No autorizado");
  }
}

export async function updateUser(formData: FormData) {
  await requireAdmin();

  const id = String(formData.get("id"));
  if (!id) throw new Error("Falta id");

  const role = String(formData.get("role")) as Role;
  if (!VALID_ROLES.includes(role)) throw new Error("Rol no válido");

  await prisma.user.update({
    where: { id },
    data: {
      firstName: String(formData.get("firstName") || ""),
      lastName1: String(formData.get("lastName1") || ""),
      lastName2: String(formData.get("lastName2") || ""),
      role,
      active: formData.get("active") === "on",
    },
  });

  revalidatePath("/admin/users");
  redirect("/admin/users");
}

export type AdminResetPasswordState = {
  error: string | null;
  ok: boolean;
};

/** Admin asigna una nueva contraseña al usuario (p. ej. olvido). No requiere la antigua. */
export async function adminResetUserPassword(
  _prev: AdminResetPasswordState,
  formData: FormData
): Promise<AdminResetPasswordState> {
  await requireAdmin();

  const targetUserId = String(formData.get("userId") ?? "");
  const next = String(formData.get("newPassword") ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");

  if (!targetUserId) {
    return { error: "Falta identificador de usuario", ok: false };
  }
  if (!next || !confirm) {
    return { error: "Indica la nueva contraseña y la confirmación", ok: false };
  }
  if (next.length < PASSWORD_MIN_LEN) {
    return {
      error: `La contraseña debe tener al menos ${PASSWORD_MIN_LEN} caracteres`,
      ok: false,
    };
  }
  if (next !== confirm) {
    return { error: "La confirmación no coincide", ok: false };
  }

  const user = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true },
  });
  if (!user) {
    return { error: "Usuario no encontrado", ok: false };
  }

  const hash = await bcrypt.hash(next, 10);
  await prisma.user.update({
    where: { id: targetUserId },
    data: { password: hash },
  });

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${targetUserId}`);
  return { error: null, ok: true };
}
