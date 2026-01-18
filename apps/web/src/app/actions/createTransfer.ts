"use server";

import { prisma } from "@/lib/prisma";
import { getOrCreateDevTecnico } from "@/lib/devUser";
import { redirect } from "next/navigation";

export async function createTransfer(formData: FormData) {
  const mrn = String(formData.get("mrn") ?? "").trim();
  const lastName1 = String(formData.get("lastName1") ?? "").trim();
  const lastName2 = String(formData.get("lastName2") ?? "").trim();
  const firstName = String(formData.get("firstName") ?? "").trim();

  if (!lastName1 || !firstName) {
    throw new Error("Apellido y nombre son obligatorios");
  }
  const patientFullName = lastName2
    ? `${lastName1} ${lastName2}, ${firstName}`
    : `${lastName1}, ${firstName}`;

  const dobRaw = String(formData.get("dob") ?? "").trim(); // YYYY-MM-DD
  const location = String(formData.get("location") ?? "").trim();
  const testType = String(formData.get("testType") ?? "").trim();
  const priority = String(formData.get("priority") ?? "NORMAL");

  if (!mrn || !lastName1 || !firstName || !dobRaw || !location || !testType) {
    throw new Error("Todos los campos obligatorios deben rellenarse");
  }

  const dob = new Date(dobRaw);
  if (Number.isNaN(dob.getTime())) {
    throw new Error("Fecha de nacimiento inválida");
  }
  if (!["NORMAL", "URGENTE"].includes(priority)) {
    throw new Error("Prioridad inválida");
  }

  const tecnico = await getOrCreateDevTecnico();

  await prisma.transfer.create({
    data: {
      mrn,
      patientFullName,
      dob,
      location,
      testType: testType as any,
      status: "SOLICITADO",
      createdById: tecnico.id,
      priority: priority as any,
    },
  });

  redirect("/");
}