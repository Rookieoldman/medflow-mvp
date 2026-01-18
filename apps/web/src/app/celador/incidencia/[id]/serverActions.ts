"use server";

import { prisma } from "@/lib/prisma";
import { getOrCreateDevCelador } from "@/lib/devUser";
import { revalidatePath } from "next/cache";

export async function acceptTransfer(formData: FormData) {
  const transferId = String(formData.get("transferId") ?? "");
  const signerName = String(formData.get("signerName") ?? "").trim();
  const signerRole = String(formData.get("signerRole") ?? "").trim();
  const signatureData = String(formData.get("signatureData") ?? "");

  if (!transferId || !signerName || !signatureData) {
    throw new Error("Datos de firma incompletos");
  }

  const celador = await getOrCreateDevCelador();

  const transfer = await prisma.transfer.findUnique({
    where: { id: transferId },
    include: { acceptance: true },
  });

  if (!transfer) throw new Error("Traslado no encontrado");

  if (transfer.acceptance) {
    throw new Error("Este traslado ya fue aceptado");
  }

  if (transfer.status !== "ASIGNADO") {
    throw new Error("El traslado no está en estado ASIGNADO");
  }

  await prisma.$transaction([
    prisma.transferAcceptance.create({
      data: {
        transferId,
        signerName,
        signerRole: signerRole || null,
        signatureData,
        celadorId: celador.id,
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
  revalidatePath(`/transfer/${transferId}`);
}