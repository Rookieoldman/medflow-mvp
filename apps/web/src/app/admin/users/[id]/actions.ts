"use server";

import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function updateUser(formData: FormData) {
  const id = String(formData.get("id"));
  if (!id) throw new Error("Falta id");

  await prisma.user.update({
    where: { id },
    data: {
      firstName: String(formData.get("firstName") || ""),
      lastName1: String(formData.get("lastName1") || ""),
      lastName2: String(formData.get("lastName2") || ""),
      role: formData.get("role") as any,
      shift: (formData.get("shift") as any) || null,
      active: formData.get("active") === "on",
    },
  });

  revalidatePath("/admin/users");
  redirect("/admin/users");
}