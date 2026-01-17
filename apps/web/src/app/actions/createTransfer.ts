"use server";

import { prisma } from "@/lib/prisma";
import { getOrCreateDevTecnico } from "@/lib/devUser";
import { redirect } from "next/navigation";

export async function createTransfer(formData: FormData) {
  const origin = String(formData.get("origin") ?? "").trim();
  const destination = String(formData.get("destination") ?? "").trim();

  if (!origin || !destination) {
    throw new Error("Origen y destino son obligatorios");
  }

  const tecnico = await getOrCreateDevTecnico();

  await prisma.transfer.create({
    data: {
      origin,
      destination,
      status: "SOLICITADO",
      createdById: tecnico.id,
    },
  });

  redirect("/");
}