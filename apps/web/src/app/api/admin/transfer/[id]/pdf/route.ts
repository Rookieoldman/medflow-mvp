import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { fDate, fDateTime } from "@/lib/format";
import {
  buildAdminTransferPdfBuffer,
  type AdminTransferPdfInput,
} from "@/lib/pdf/buildAdminTransferPdf";

export const dynamic = "force-dynamic";

const TEST_LABELS: Record<string, string> = {
  RM: "RM",
  ECO: "Eco",
  RX: "RX",
  MEDICINA_NUCLEAR: "Med. nuclear",
  TC: "TC",
};

const STATUS_LABELS: Record<string, string> = {
  SOLICITADO: "Solicitado",
  ASIGNADO: "Asignado",
  EN_CURSO: "En curso",
  EN_PRUEBA: "En prueba",
  PAUSADO: "Pausado",
  FINALIZADO: "Finalizado",
  CANCELADO: "Cancelado",
};

const DIFFICULTY_LABELS: Record<string, string> = {
  BANAL: "Banal",
  MODERADO: "Moderado",
  CRITICO: "Crítico",
};

const INCIDENT_LABELS: Record<string, string> = {
  PACIENTE_NO_PREPARADO: "Paciente no preparado",
  ESPERA_CLINICA: "Espera clínica",
  PRUEBA_CANCELADA: "Prueba cancelada",
  OTRO: "Otro",
};

function userLabel(u: {
  firstName: string | null;
  lastName1: string | null;
  email: string;
}): string {
  return [u.firstName, u.lastName1].filter(Boolean).join(" ") || u.email;
}

function safeFilenamePart(s: string): string {
  return s.replace(/[^\w.-]+/g, "_").slice(0, 80) || "traslado";
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    return new NextResponse("No autorizado", { status: 401 });
  }

  const { id } = await context.params;
  if (!id) {
    return new NextResponse("Falta id", { status: 400 });
  }

  const transfer = await prisma.transfer.findUnique({
    where: { id },
    include: {
      createdBy: true,
      assignedTo: true,
      acceptance: true,
      incidents: { include: { createdBy: true }, orderBy: { createdAt: "asc" } },
      events: {
        include: {
          actor: { select: { firstName: true, lastName1: true, email: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!transfer) {
    return new NextResponse("No encontrado", { status: 404 });
  }

  const isFinal = ["FINALIZADO", "CANCELADO"].includes(transfer.status);
  const durationMin = isFinal
    ? Math.round((transfer.updatedAt.getTime() - transfer.createdAt.getTime()) / 60000)
    : null;

  const payload: AdminTransferPdfInput = {
    mrn: transfer.mrn,
    patientFullName: transfer.patientFullName,
    dobFormatted: fDate(transfer.dob),
    location: transfer.location,
    testTypeLabel: TEST_LABELS[transfer.testType] ?? transfer.testType,
    scopeLabel: transfer.scope === "URGENCIAS" ? "Urgencias" : "Planta",
    priorityLabel: transfer.priority === "URGENTE" ? "Urgente" : "Normal",
    difficultyLabel: DIFFICULTY_LABELS[transfer.difficulty] ?? transfer.difficulty,
    statusLabel: STATUS_LABELS[transfer.status] ?? transfer.status,
    requiresAcceptanceLabel: transfer.requiresAcceptance ? "Sí" : "No",
    createdAtFormatted: fDateTime(transfer.createdAt),
    updatedAtFormatted: fDateTime(transfer.updatedAt),
    durationLabel: durationMin !== null ? `${durationMin} min` : null,
    creatorName: userLabel(transfer.createdBy),
    celadorName: transfer.assignedTo ? userLabel(transfer.assignedTo) : null,
    acceptance: transfer.acceptance
      ? {
          signerName: transfer.acceptance.signerName,
          signerRole: transfer.acceptance.signerRole,
          signedAtFormatted: fDateTime(transfer.acceptance.signedAt),
          signatureDataUrl: transfer.acceptance.signatureData,
        }
      : null,
    incidents: transfer.incidents.map((i) => ({
      typeLabel: INCIDENT_LABELS[i.type] ?? i.type,
      note: i.note,
      atFormatted: fDateTime(i.createdAt),
      byName: userLabel(i.createdBy),
    })),
    events: transfer.events.map((e) => ({
      atFormatted: fDateTime(e.createdAt),
      fromLabel: e.fromStatus ? (STATUS_LABELS[e.fromStatus] ?? e.fromStatus) : "",
      toLabel: STATUS_LABELS[e.toStatus] ?? e.toStatus,
      actorName: userLabel(e.actor),
      note: e.note,
    })),
  };

  const buffer = await buildAdminTransferPdfBuffer(payload);
  const name = `traslado_${safeFilenamePart(transfer.mrn)}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
