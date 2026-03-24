"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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

export async function createUser(formData: FormData) {
  await requireAdmin();

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role")) as Role;

  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName1 = String(formData.get("lastName1") ?? "").trim();
  const lastName2 = String(formData.get("lastName2") ?? "").trim();
  const active = formData.get("active") === "on";

  if (!email || !password || !role) {
    redirect("/admin/users/new?error=campos_requeridos");
  }

  if (!VALID_ROLES.includes(role)) {
    redirect("/admin/users/new?error=rol_invalido");
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    await prisma.user.create({
      data: { email, password: hashedPassword, role, firstName, lastName1, lastName2, active },
    });
  } catch (e: any) {
    if (e?.code === "P2002") {
      redirect(`/admin/users/new?error=email_duplicado&email=${encodeURIComponent(email)}`);
    }
    throw e;
  }

  revalidatePath("/admin/users");
  redirect("/admin/users");
}
