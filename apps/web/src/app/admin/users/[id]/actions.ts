"use server";

import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";

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
