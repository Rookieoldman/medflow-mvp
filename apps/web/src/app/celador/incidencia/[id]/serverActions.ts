"use server";

import { prisma } from "@/lib/prisma";
import { getOrCreateDevCelador } from "@/lib/devUser";
import { redirect } from "next/navigation";

export async function createIncident(formData: FormData) {
    const transferId = String(formData.get("transferId") ?? "");
    const type = String(formData.get("type") ?? "OTRO");
    const note = String(formData.get("note") ?? "").trim();

    const celador = await getOrCreateDevCelador();

    const t = await prisma.transfer.findUnique({ where: { id: transferId } });
    if (!t) throw new Error("Traslado no encontrado");

    if (t.assignedToId && t.assignedToId !== celador.id) {
        throw new Error("No puedes registrar incidencias en un traslado de otro celador");
    }

    await prisma.incident.create({
        data: {
            transferId,
            type: type as any,
            note: note || null,
            createdById: celador.id,
        },
    });

    redirect(`/transfer/${transferId}`);
}