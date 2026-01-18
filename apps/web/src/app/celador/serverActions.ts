"use server";

import { prisma } from "@/lib/prisma";
import { getOrCreateDevCelador } from "@/lib/devUser";
import { revalidatePath } from "next/cache";

function getNextStatus(current: string) {
  // Flujo básico del celador
  switch (current) {
    case "ASIGNADO":
      return "EN_CURSO";
    case "EN_CURSO":
      return "EN_CAMINO_PRUEBA";
    case "EN_CAMINO_PRUEBA":
      return "EN_ESPERA";
    case "EN_ESPERA":
      return "VUELTA";
    case "VUELTA":
      return "FINALIZADO";
    default:
      return null;
  }
}

export async function assignToMe(formData: FormData) {
  const transferId = String(formData.get("transferId") ?? "");
  if (!transferId) throw new Error("Falta transferId");

  const celador = await getOrCreateDevCelador();

  const t = await prisma.transfer.findUnique({ where: { id: transferId } });
  if (!t) throw new Error("Traslado no encontrado");

  if (t.status !== "SOLICITADO" || t.assignedToId) {
    throw new Error("Este traslado ya no está disponible");
  }

  await prisma.transfer.update({
    where: { id: transferId },
    data: {
      status: "ASIGNADO",
      assignedToId: celador.id,
    },
  });

  revalidatePath("/celador");
}

export async function nextStatus(formData: FormData) {
  const transferId = String(formData.get("transferId") ?? "");
  if (!transferId) throw new Error("Falta transferId");

  const celador = await getOrCreateDevCelador();

  const t = await prisma.transfer.findUnique({ where: { id: transferId } });
  if (!t) throw new Error("Traslado no encontrado");
  if (t.assignedToId !== celador.id) throw new Error("No puedes operar este traslado");
  if (t.status === "PAUSADO") throw new Error("Está pausado. Reanuda antes de avanzar.");

  const next = getNextStatus(t.status);
  if (!next) throw new Error(`No hay “siguiente” desde ${t.status}`);

  await prisma.transfer.update({
    where: { id: transferId },
    data: { status: next as any },
  });

  revalidatePath("/celador");
  revalidatePath(`/transfer/${transferId}`);
}

export async function pauseTransfer(formData: FormData) {
  const transferId = String(formData.get("transferId") ?? "");
  if (!transferId) throw new Error("Falta transferId");

  const celador = await getOrCreateDevCelador();

  const t = await prisma.transfer.findUnique({ where: { id: transferId } });
  if (!t) throw new Error("Traslado no encontrado");
  if (t.assignedToId !== celador.id) throw new Error("No puedes operar este traslado");
  if (t.status === "FINALIZADO") throw new Error("Ya está finalizado");
  if (t.status === "PAUSADO") return;

  await prisma.transfer.update({
    where: { id: transferId },
    data: { previousStatus: t.status, status: "PAUSADO" },
  });

  revalidatePath("/celador");
  revalidatePath(`/transfer/${transferId}`);
}

export async function resumeTransfer(formData: FormData) {
  const transferId = String(formData.get("transferId") ?? "");
  if (!transferId) throw new Error("Falta transferId");

  const celador = await getOrCreateDevCelador();

  const t = await prisma.transfer.findUnique({ where: { id: transferId } });
  if (!t) throw new Error("Traslado no encontrado");
  if (t.assignedToId !== celador.id) throw new Error("No puedes operar este traslado");
  if (t.status !== "PAUSADO") return;

  await prisma.transfer.update({
    where: { id: transferId },
    data: { status: t.previousStatus ?? "ASIGNADO", previousStatus: null },
  });

  revalidatePath("/celador");
  revalidatePath(`/transfer/${transferId}`);
}