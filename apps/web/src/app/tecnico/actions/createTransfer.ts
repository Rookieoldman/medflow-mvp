"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { redirect } from "next/navigation";

export async function createTransfer(formData: FormData) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) throw new Error("No autenticado");
  if (session.user.role !== "TECNICO") throw new Error("No autorizado");

  const mrn = String(formData.get("mrn") ?? "").trim();
  const lastName1 = String(formData.get("lastName1") ?? "").trim();
  const lastName2 = String(formData.get("lastName2") ?? "").trim();
  const firstName = String(formData.get("firstName") ?? "").trim();
  const dobRaw = String(formData.get("dob") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const testType = String(formData.get("testType") ?? "").trim();
  const priority   = String(formData.get("priority")   ?? "NORMAL");
  const scope      = String(formData.get("scope")      ?? "URGENCIAS");
  const difficulty = String(formData.get("difficulty") ?? "MODERADO");

  if (!mrn || !lastName1 || !firstName || !dobRaw || !location || !testType) {
    throw new Error("Campos obligatorios incompletos");
  }

  const patientFullName = lastName2
    ? `${lastName1} ${lastName2}, ${firstName}`
    : `${lastName1}, ${firstName}`;

  const dob = new Date(dobRaw);
  if (Number.isNaN(dob.getTime())) {
    throw new Error("Fecha de nacimiento inválida");
  }

  if (!["NORMAL", "URGENTE"].includes(priority)) {
    throw new Error("Prioridad inválida");
  }

  if (!["URGENCIAS", "PLANTA"].includes(scope)) {
    throw new Error("Ámbito inválido");
  }

  if (!["BANAL", "MODERADO", "CRITICO"].includes(difficulty)) {
    throw new Error("Dificultad inválida");
  }

  const requiresAcceptance = scope === "PLANTA";

  await prisma.transfer.create({
    data: {
      mrn,
      patientFullName,
      dob,
      location,
      testType:   testType   as any,
      priority:   priority   as any,
      scope:      scope      as any,
      difficulty: difficulty as any,
      requiresAcceptance,
      status: "SOLICITADO",
      createdById: session.user.id,
    },
  });

  redirect("/tecnico");
}