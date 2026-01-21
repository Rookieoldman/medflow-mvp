"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { redirect } from "next/navigation";

export async function createTransfer(formData: FormData) {
  // 🔐 SESIÓN REAL
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new Error("No autenticado");
  }

  const mrn = String(formData.get("mrn") ?? "").trim();
  const lastName1 = String(formData.get("lastName1") ?? "").trim();
  const lastName2 = String(formData.get("lastName2") ?? "").trim();
  const firstName = String(formData.get("firstName") ?? "").trim();
  const dobRaw = String(formData.get("dob") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const testType = String(formData.get("testType") ?? "").trim();
  const priority = String(formData.get("priority") ?? "NORMAL");

  if (!mrn || !lastName1 || !firstName || !dobRaw || !location || !testType) {
    throw new Error("Todos los campos obligatorios deben rellenarse");
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

  await prisma.transfer.create({
    data: {
      mrn,
      patientFullName,
      dob,
      location,
      testType: testType as any,
      priority: priority as any,
      status: "SOLICITADO",

      // ✅ AQUÍ ESTÁ LA CLAVE
      createdById: session.user.id,
    },
  });
  console.log("CREATED BY ID:", session.user.id);
  redirect("/tecnico");
}