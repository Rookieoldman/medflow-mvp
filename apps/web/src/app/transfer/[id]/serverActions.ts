"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function markEnLaPrueba(formData: FormData) {
  const transferId = String(formData.get("transferId") ?? "");

  const transfer = await prisma.transfer.findUnique({
    where: { id: transferId },
  });

  if (!transfer) {
    throw new Error("Traslado no encontrado");
  }

  if (
    transfer.status !== "EN_CAMINO_PRUEBA" &&
    transfer.status !== "EN_ESPERA"
  ) {
    throw new Error("No se puede marcar 'En la prueba' en este estado");
  }

  await prisma.transfer.update({
    where: { id: transferId },
    data: { status: "EN_LA_PRUEBA" },
  });

  revalidatePath(`/transfer/${transferId}`);
}