"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";

/* ============================================================
   ASIGNARSE UN TRASLADO
============================================================ */
export async function assignToMe(formData: FormData) {
  const transferId = String(formData.get("transferId") ?? "");

  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "CELADOR") {
    throw new Error("No autorizado");
  }

  const celadorId = session.user.id;

  const transfer = await prisma.transfer.findUnique({
    where: { id: transferId },
  });

  if (!transfer) throw new Error("Traslado no encontrado");
  if (transfer.assignedToId) throw new Error("Ya está asignado");

  await prisma.transfer.update({
    where: { id: transferId },
    data: {
      assignedToId: celadorId,
      status: "ASIGNADO",
    },
  });

  revalidatePath("/celador");
}

/* ============================================================
   ACEPTAR TRASLADO (FIRMA)
   ASIGNADO → EN_CURSO
============================================================ */
export async function acceptTransfer(formData: FormData) {
  const transferId = String(formData.get("transferId") ?? "");
  const signerName = String(formData.get("signerName") ?? "").trim();
  const signerRole = String(formData.get("signerRole") ?? "").trim();
  const signatureData = String(formData.get("signatureData") ?? "");

  if (!transferId || !signerName || !signatureData) {
    throw new Error("Datos incompletos");
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "CELADOR") {
    throw new Error("No autorizado");
  }

  const celadorId = session.user.id;

  const transfer = await prisma.transfer.findUnique({
    where: { id: transferId },
    include: { acceptance: true },
  });

  if (!transfer) throw new Error("Traslado no encontrado");
  if (transfer.acceptance) throw new Error("Ya aceptado");
  if (transfer.assignedToId !== celadorId) {
    throw new Error("No es tu traslado");
  }
  if (transfer.status !== "ASIGNADO") {
    throw new Error("Estado inválido");
  }

  await prisma.$transaction([
    prisma.transferAcceptance.create({
      data: {
        transferId,
        signerName,
        signerRole: signerRole || null,
        signatureData,
        celadorId,
      },
    }),
    prisma.transfer.update({
      where: { id: transferId },
      data: {
        status: "EN_CURSO",
        previousStatus: "ASIGNADO",
      },
    }),
  ]);

  revalidatePath("/celador");
}

/* ============================================================
   CAMBIO DE ESTADO
============================================================ */
export async function setStatus(formData: FormData) {
  const transferId = String(formData.get("transferId") ?? "");
  const next = String(formData.get("next") ?? "");

  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "CELADOR") {
    throw new Error("No autorizado");
  }

  const celadorId = session.user.id;

  const transfer = await prisma.transfer.findUnique({
    where: { id: transferId },
  });

  if (!transfer) throw new Error("Traslado no encontrado");
  if (transfer.assignedToId !== celadorId) {
    throw new Error("No es tu traslado");
  }

  await prisma.transfer.update({
    where: { id: transferId },
    data: { status: next as any },
  });

  revalidatePath("/celador");
}

/* ============================================================
   PAUSAR / REANUDAR
============================================================ */
export async function pauseTransfer(formData: FormData) {
  const transferId = String(formData.get("transferId") ?? "");

  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "CELADOR") {
    throw new Error("No autorizado");
  }

  const celadorId = session.user.id;

  const transfer = await prisma.transfer.findUnique({
    where: { id: transferId },
  });

  if (!transfer) throw new Error("Traslado no encontrado");
  if (transfer.assignedToId !== celadorId) {
    throw new Error("No es tu traslado");
  }

  await prisma.transfer.update({
    where: { id: transferId },
    data: {
      previousStatus: transfer.status,
      status: "PAUSADO",
    },
  });

  revalidatePath("/celador");
}

export async function resumeTransfer(formData: FormData) {
  const transferId = String(formData.get("transferId") ?? "");

  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "CELADOR") {
    throw new Error("No autorizado");
  }

  const celadorId = session.user.id;

  const transfer = await prisma.transfer.findUnique({
    where: { id: transferId },
  });

  if (!transfer) throw new Error("Traslado no encontrado");
  if (transfer.assignedToId !== celadorId) {
    throw new Error("No es tu traslado");
  }

  await prisma.transfer.update({
    where: { id: transferId },
    data: {
      status: transfer.previousStatus ?? "ASIGNADO",
      previousStatus: null,
    },
  });

  revalidatePath("/celador");
}