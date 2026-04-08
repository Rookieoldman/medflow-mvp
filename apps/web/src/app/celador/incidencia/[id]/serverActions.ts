"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { redirect } from "next/navigation";
import { createIncidentPrecheck } from "@/lib/celadorActionGuards";

export async function createIncident(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "CELADOR") {
    throw new Error("No autorizado");
  }

  const celadorId = session.user.id;
  const transferId = String(formData.get("transferId") ?? "");
  const type = String(formData.get("type") ?? "OTRO");
  const note = String(formData.get("note") ?? "").trim();

  if (!transferId) throw new Error("Falta transferId");

  const t = await prisma.transfer.findUnique({ where: { id: transferId } });
  if (!t) throw new Error("Traslado no encontrado");

  const inc = createIncidentPrecheck(t, celadorId);
  if (!inc.ok) throw new Error(inc.message);

  await prisma.incident.create({
    data: {
      transferId,
      type: type as any,
      note: note || null,
      createdById: celadorId,
    },
  });

  redirect(`/celador/transfer/${transferId}`);
}
