"use server";

import { prisma } from "@/lib/prisma";
import { getOrCreateDevCelador } from "@/lib/devUser";
import { revalidatePath } from "next/cache";

const ALLOWED: Record<string, string[]> = {
    SOLICITADO: ["ASIGNADO"],
    ASIGNADO: ["EN_CURSO", "PAUSADO"],
    EN_CURSO: ["EN_CAMINO_PRUEBA", "PAUSADO"],
    EN_CAMINO_PRUEBA: ["EN_ESPERA", "EN_LA_PRUEBA", "PAUSADO"],
    EN_ESPERA: ["EN_LA_PRUEBA", "PAUSADO"],
    EN_LA_PRUEBA: ["VUELTA", "PAUSADO"],
    VUELTA: ["FINALIZADO", "PAUSADO"],
    PAUSADO: [], // se gestiona con resume
    FINALIZADO: [],
};

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
        data: { status: "ASIGNADO", assignedToId: celador.id },
    });

    revalidatePath("/celador");
    revalidatePath(`/transfer/${transferId}`);
}

export async function setStatus(formData: FormData) {
    const transferId = String(formData.get("transferId") ?? "");
    const next = String(formData.get("next") ?? "");
    if (!transferId || !next) throw new Error("Falta transferId/next");

    const celador = await getOrCreateDevCelador();
    const t = await prisma.transfer.findUnique({ where: { id: transferId } });
    if (!t) throw new Error("Traslado no encontrado");
    if (t.assignedToId !== celador.id) throw new Error("No puedes operar este traslado");
    if (t.status === "PAUSADO") throw new Error("Está pausado. Reanuda antes de cambiar estado.");

    const allowed = ALLOWED[t.status] ?? [];
    if (!allowed.includes(next)) {
        throw new Error(`Transición no permitida: ${t.status} → ${next}`);
    }

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