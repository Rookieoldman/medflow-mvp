import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardHeader, PageHeader, EmptyState } from "@/components/ui";
import { StatusBadge } from "@/components/StatusBadge";
import { PriorityBadge } from "@/components/PriorityBadge";
import { DifficultyBadge } from "@/components/DifficultyBadge";
import { TransferTimeline } from "@/components/TransferTimeline";
import { fDate, fDateTime } from "@/lib/format";
import { ReleaseToPoolButton } from "@/app/celador/ReleaseToPoolButton";
import { celadorMayViewTransferDetail } from "@/lib/celadorTransferAccess";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const INCIDENT_LABELS: Record<string, string> = {
  PACIENTE_NO_PREPARADO: "Paciente no preparado",
  ESPERA_CLINICA:        "Espera clínica",
  PRUEBA_CANCELADA:      "Prueba cancelada",
  OTRO:                  "Otro",
};

export default async function CeladorTransferDetail({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "CELADOR") redirect("/login");

  const { id } = await Promise.resolve(params as any);
  if (!id) return <main className="p-6">Falta el id en la URL.</main>;

  const transfer = await prisma.transfer.findUnique({
    where: { id },
    include: {
      acceptance: true,
      incidents:  { orderBy: { createdAt: "desc" } },
      events:     {
        include: { actor: { select: { firstName: true, lastName1: true, email: true, role: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!transfer) return <main className="p-6">Traslado no encontrado.</main>;

  if (!celadorMayViewTransferDetail(transfer, session.user.id)) {
    redirect("/celador");
  }

  const isAssigned = transfer.assignedToId === session.user.id;
  const isFinal    = ["FINALIZADO", "CANCELADO"].includes(transfer.status);
  const canReleaseToPool =
    isAssigned &&
    !isFinal &&
    ["ASIGNADO", "EN_CURSO", "PAUSADO"].includes(transfer.status);

  return (
    <main className="max-w-2xl mx-auto px-4 sm:px-6 py-5 sm:py-6 space-y-5">
      <PageHeader
        title={transfer.patientFullName}
        subtitle={`Nº Historia: ${transfer.mrn}`}
        back={{ href: "/celador", label: "Mis traslados" }}
      />

      {/* ESTADO + BADGES */}
      <Card>
        <div className="flex flex-wrap items-center gap-2 justify-between">
          <div className="flex flex-wrap gap-2">
            <StatusBadge     status={transfer.status} />
            <PriorityBadge   priority={transfer.priority} />
            <DifficultyBadge difficulty={transfer.difficulty} />
          </div>
          {transfer.acceptance && (
            <span className="text-xs text-green-700 bg-green-50 border border-green-100 rounded-full px-2 py-0.5 font-medium">
              ✔ Firmado
            </span>
          )}
        </div>
      </Card>

      {/* DATOS */}
      <Card>
        <CardHeader title="Datos del traslado" />
        <dl className="space-y-2 text-sm">
          <Row label="Paciente"    value={transfer.patientFullName} />
          <Row label="Nacimiento"  value={fDate(transfer.dob)} />
          <Row label="Ubicación"   value={transfer.location} />
          <Row label="Prueba"      value={transfer.testType} />
          <Row label="Solicitado"  value={fDateTime(transfer.createdAt)} />
          {isFinal && <Row label="Finalizado" value={fDateTime(transfer.updatedAt)} />}
        </dl>
      </Card>

      {/* ACCIONES */}
      {isAssigned && !isFinal && (
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href={`/celador/incidencia/${transfer.id}`}
            className="inline-flex items-center gap-2 border rounded-lg px-4 py-2.5 text-sm font-medium text-orange-700 border-orange-200 bg-orange-50 hover:bg-orange-100 transition-colors"
          >
            ⚠ Registrar incidencia
          </Link>
          {canReleaseToPool && <ReleaseToPoolButton transferId={transfer.id} />}
        </div>
      )}

      {/* HISTORIAL */}
      <Card>
        <CardHeader
          title="Historial"
          subtitle={`${transfer.events.length} eventos`}
        />
        <TransferTimeline events={transfer.events} />
      </Card>

      {/* INCIDENCIAS */}
      <Card>
        <CardHeader title={`Incidencias · ${transfer.incidents.length}`} />
        {transfer.incidents.length === 0 ? (
          <EmptyState title="Sin incidencias" icon="✅" subtitle="No se han registrado incidencias" />
        ) : (
          <ul className="space-y-2">
            {transfer.incidents.map((i) => (
              <li key={i.id} className="border border-gray-100 rounded-lg p-3 text-sm space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-gray-800">{INCIDENT_LABELS[i.type] ?? i.type}</span>
                  <span className="text-xs text-gray-400">{fDateTime(i.createdAt)}</span>
                </div>
                {i.note && <p className="text-gray-600">{i.note}</p>}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </main>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-gray-400 shrink-0">{label}</dt>
      <dd className="text-gray-700 text-right">{value}</dd>
    </div>
  );
}
