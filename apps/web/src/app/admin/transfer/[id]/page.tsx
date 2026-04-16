import { prisma } from "@/lib/prisma";
import { Card, CardHeader, PageHeader, EmptyState } from "@/components/ui";
import { StatusBadge } from "@/components/StatusBadge";
import { PriorityBadge } from "@/components/PriorityBadge";
import { DifficultyBadge } from "@/components/DifficultyBadge";
import { TransferTimeline } from "@/components/TransferTimeline";
import { fDate, fDateTime } from "@/lib/format";
import { getShift, SHIFT_LABEL } from "@/lib/shifts";
import AssignForm from "./AssignForm";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const INCIDENT_LABELS: Record<string, string> = {
  PACIENTE_NO_PREPARADO: "Paciente no preparado",
  ESPERA_CLINICA:        "Espera clínica",
  PRUEBA_CANCELADA:      "Prueba cancelada",
  OTRO:                  "Otro",
};

const TEST_LABELS: Record<string, string> = {
  RM: "RM", ECO: "Eco", RX: "RX", MEDICINA_NUCLEAR: "Med. Nuclear", TC: "TC",
};

export default async function AdminTransferDetail({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const { id } = await Promise.resolve(params as any);
  if (!id) return <p className="p-6 text-sm text-gray-500">Falta el id.</p>;

  const now          = new Date();
  const currentShift = getShift(now);

  const [transfer, celadores] = await Promise.all([
    prisma.transfer.findUnique({
      where: { id },
      include: {
        createdBy:  true,
        assignedTo: true,
        acceptance: true,
        incidents: { include: { createdBy: true }, orderBy: { createdAt: "desc" } },
        events:    {
          include: { actor: { select: { firstName: true, lastName1: true, email: true, role: true } } },
          orderBy: { createdAt: "asc" },
        },
      },
    }),
    prisma.user.findMany({
      where:   { role: "CELADOR", active: true, activeShift: currentShift },
      orderBy: { firstName: "asc" },
      select:  { id: true, firstName: true, lastName1: true, email: true, breakUntil: true },
    }),
  ]);

  if (!transfer) return <p className="p-6 text-sm text-gray-500">Traslado no encontrado.</p>;

  const isFinal = ["FINALIZADO", "CANCELADO"].includes(transfer.status);
  const durationMin = isFinal
    ? Math.round((transfer.updatedAt.getTime() - transfer.createdAt.getTime()) / 60000)
    : null;

  const creatorName = [transfer.createdBy.firstName, transfer.createdBy.lastName1].filter(Boolean).join(" ") || transfer.createdBy.email;
  const celadorName = transfer.assignedTo
    ? [transfer.assignedTo.firstName, transfer.assignedTo.lastName1].filter(Boolean).join(" ") || transfer.assignedTo.email
    : null;

  return (
    <div className="max-w-3xl mx-auto px-0 space-y-5">
      <PageHeader
        title={transfer.patientFullName}
        subtitle={`Nº Historia: ${transfer.mrn}`}
        back={{ href: "/admin/transfers", label: "Volver a traslados" }}
        action={
          <a
            href={`/api/admin/transfer/${transfer.id}/pdf`}
            className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-800 shadow-sm hover:bg-gray-50 hover:border-gray-400 transition-colors"
            download
          >
            Descargar PDF
          </a>
        }
      />

      {/* ── ESTADO + BADGES ── */}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <StatusBadge     status={transfer.status} />
            <PriorityBadge   priority={transfer.priority} />
            <DifficultyBadge difficulty={transfer.difficulty} />
          </div>
          {durationMin !== null && (
            <span className="text-sm text-gray-500">
              Duración total: <strong className="text-gray-900">{durationMin} min</strong>
            </span>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* ── DATOS CLÍNICOS ── */}
        <Card>
          <CardHeader title="Datos clínicos" />
          <dl className="space-y-2 text-sm">
            <Row label="Fecha de nacimiento" value={fDate(transfer.dob)} />
            <Row label="Ubicación"           value={transfer.location} />
            <Row label="Tipo de prueba"      value={TEST_LABELS[transfer.testType] ?? transfer.testType} />
            <Row label="Ámbito"              value={transfer.scope === "URGENCIAS" ? "Urgencias" : "Planta"} />
            <Row label="Requiere firma"      value={transfer.requiresAcceptance ? "Sí" : "No"} />
            <Row label="Solicitado"          value={fDateTime(transfer.createdAt)} />
            {isFinal && <Row label="Finalizado" value={fDateTime(transfer.updatedAt)} />}
          </dl>
        </Card>

        {/* ── RESPONSABLES ── */}
        <Card>
          <CardHeader title="Responsables" />
          <dl className="space-y-2 text-sm">
            <Row label="Técnico"  value={creatorName} />
            <Row
              label="Celador"
              value={celadorName ?? <span className="text-gray-400 italic">Sin asignar</span>}
            />
          </dl>

          {/* Asignación manual */}
          {!isFinal && (
            <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  {transfer.assignedToId ? "Reasignar celador" : "Asignar celador"}
                </p>
                <span className="text-xs text-gray-400">{SHIFT_LABEL[currentShift]}</span>
              </div>
              {celadores.length === 0 ? (
                <p className="text-xs text-amber-600 italic">
                  Sin celadores en {SHIFT_LABEL[currentShift]}. Asígnalos desde la gestión de usuarios.
                </p>
              ) : (
                <AssignForm
                  transferId={transfer.id}
                  celadores={celadores.map((c) => ({
                    id:      c.id,
                    name:    [c.firstName, c.lastName1].filter(Boolean).join(" ") || c.email,
                    onBreak: !!(c.breakUntil && c.breakUntil > now),
                  }))}
                  currentCeladorId={transfer.assignedToId ?? undefined}
                />
              )}
            </div>
          )}
        </Card>
      </div>

      {/* ── FIRMA ── */}
      {transfer.requiresAcceptance && (
        <Card>
          <CardHeader title="Aceptación del traslado" />
          {!transfer.acceptance ? (
            <p className="text-sm text-gray-400 italic">Pendiente de firma de responsable de planta.</p>
          ) : (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <dl className="space-y-2">
                <Row label="Firmante"    value={transfer.acceptance.signerName} />
                {transfer.acceptance.signerRole && (
                  <Row label="Rol"       value={transfer.acceptance.signerRole} />
                )}
                <Row label="Fecha firma" value={fDateTime(transfer.acceptance.signedAt)} />
              </dl>
              <div>
                <p className="text-xs text-gray-500 mb-2">Firma digitalizada</p>
                <div className="border rounded-lg p-2 bg-gray-50 inline-block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={transfer.acceptance.signatureData}
                    alt="Firma del responsable"
                    className="max-h-24"
                  />
                </div>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* ── HISTORIAL ── */}
      <Card>
        <CardHeader
          title="Historial de estados"
          subtitle={`${transfer.events.length} eventos registrados`}
        />
        <TransferTimeline events={transfer.events} />
      </Card>

      {/* ── INCIDENCIAS ── */}
      <Card>
        <CardHeader title={`Incidencias · ${transfer.incidents.length}`} />
        {transfer.incidents.length === 0 ? (
          <EmptyState title="Sin incidencias" subtitle="No se han registrado incidencias para este traslado" icon="✅" />
        ) : (
          <ul className="space-y-2">
            {transfer.incidents.map((i) => (
              <li key={i.id} className="border border-gray-100 rounded-lg p-3 text-sm space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-gray-800">
                    {INCIDENT_LABELS[i.type] ?? i.type}
                  </span>
                  <span className="text-xs text-gray-400">{fDateTime(i.createdAt)}</span>
                </div>
                {i.note && <p className="text-gray-600">{i.note}</p>}
                {i.createdBy && (
                  <p className="text-xs text-gray-400">
                    {[i.createdBy.firstName, i.createdBy.lastName1].filter(Boolean).join(" ") || i.createdBy.email}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
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
