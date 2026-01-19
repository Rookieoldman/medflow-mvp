"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createUser(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const role = formData.get("role") as any;

  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName1 = String(formData.get("lastName1") ?? "").trim();
  const lastName2 = String(formData.get("lastName2") ?? "").trim();

  const shift = (formData.get("shift") as any) || null;
  const active = formData.get("active") === "on";

  if (!email || !password || !role) {
    throw new Error("Email, contraseña y rol son obligatorios");
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      role,
      firstName,
      lastName1,
      lastName2,
      shift,
      active,
    },
  });

  revalidatePath("/admin/users");
  redirect("/admin/users");
}