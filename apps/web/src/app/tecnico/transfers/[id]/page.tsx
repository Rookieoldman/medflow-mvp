import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { redirect } from "next/navigation";
import { cancelPrueba } from "./serverActions";
import CancelPruebaButton from "./CancelPruebaButton";
import { Card, CardHeader, PageHeader, EmptyState } from "@/components/ui";
import { StatusBadge } from "@/components/StatusBadge";
import { PriorityBadge } from "@/components/PriorityBadge";
import { DifficultyBadge } from "@/components/DifficultyBadge";
import { TransferTimeline } from "@/components/TransferTimeline";
import { fDate, fDateTime, fElapsed } from "@/lib/format";

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

export default async function TransferDetail({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const { id } = await Promise.resolve(params as any);
  if (!id) return <main className="p-6">Falta el id en la URL.</main>;

  const transfer = await prisma.transfer.findUnique({
    where: { id },
    include: {
      assignedTo: { select: { firstName: true, lastName1: true, email: true } },
      incidents:  { orderBy: { createdAt: "desc" } },
      events:     {
        include: { actor: { select: { firstName: true, lastName1: true, email: true, role: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!transfer) return <main className="p-6">Traslado no encontrado.</main>;

  const isCreator         = transfer.createdById === session.user.id;
  const isFinal           = ["FINALIZADO", "CANCELADO"].includes(transfer.status);
  const canSeeSensitive   = isCreator;
  const canCancel         = !isFinal && isCreator;
  const celadorName       = transfer.assignedTo
    ? [transfer.assignedTo.firstName, transfer.assignedTo.lastName1].filter(Boolean).join(" ") || transfer.assignedTo.email
    : null;

  return (
    <main className="max-w-2xl mx-auto px-4 sm:px-6 py-5 sm:py-6 space-y-5">
      <PageHeader
        title={canSeeSensitive ? transfer.patientFullName : "Traslado"}
        subtitle={`Nº Historia: ${transfer.mrn}`}
        back={{ href: "/tecnico", label: "Mis solicitudes" }}
      />

      {/* ESTADO + BADGES */}
      <Card>
        <div className="flex flex-wrap gap-2 items-center justify-between">
          <div className="flex flex-wrap gap-2">
            <StatusBadge     status={transfer.status} />
            <PriorityBadge   priority={transfer.priority} />
            <DifficultyBadge difficulty={transfer.difficulty} />
          </div>
          {!isFinal && (
            <span className="text-xs text-gray-400">
              Abierto hace {fElapsed(transfer.createdAt)}
            </span>
          )}
        </div>

        {isFinal && (
          <div className={`mt-3 rounded-lg px-3 py-2 text-sm ${
            transfer.status === "CANCELADO"
              ? "bg-red-50 text-red-700 border border-red-100"
              : "bg-green-50 text-green-700 border border-green-100"
          }`}>
            {transfer.status === "CANCELADO" ? "Traslado cancelado." : "Traslado finalizado correctamente."}
          </div>
        )}
      </Card>

      {/* DATOS DEL TRASLADO */}
      <Card>
        <CardHeader title="Datos del traslado" />
        <dl className="space-y-2 text-sm">
          <Row label="Ubicación"    value={transfer.location} />
          <Row label="Tipo"         value={TEST_LABELS[transfer.testType] ?? transfer.testType} />
          <Row label="Ámbito"       value={transfer.scope === "URGENCIAS" ? "Urgencias" : "Planta"} />
          <Row label="Solicitado"   value={fDateTime(transfer.createdAt)} />
          {canSeeSensitive && (
            <>
              <Row label="Paciente"    value={transfer.patientFullName} />
              <Row label="Nacimiento"  value={fDate(transfer.dob)} />
            </>
          )}
          {!canSeeSensitive && (
            <p className="text-xs text-gray-400 italic">
              Datos personales ocultos — no eres el creador de este traslado.
            </p>
          )}
        </dl>
      </Card>

      {/* PROGRESO — quién lo lleva */}
      <Card>
        <CardHeader title="Progreso del traslado" />
        {!transfer.assignedTo ? (
          <p className="text-sm text-gray-400 italic">Pendiente de asignación a celador.</p>
        ) : (
          <div className="flex items-center gap-3 text-sm">
            <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-sm flex-shrink-0">
              {(transfer.assignedTo.firstName?.[0] ?? transfer.assignedTo.email[0]).toUpperCase()}
            </div>
            <div>
              <p className="font-medium text-gray-900">{celadorName}</p>
              <p className="text-xs text-gray-400">Celador asignado</p>
            </div>
            <div className="ml-auto">
              <StatusBadge status={transfer.status} />
            </div>
          </div>
        )}
      </Card>

      {/* CANCELAR */}
      {canCancel && (
        <CancelPruebaButton transferId={transfer.id} action={cancelPrueba} />
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
      {transfer.incidents.length > 0 && (
        <Card>
          <CardHeader title={`Incidencias · ${transfer.incidents.length}`} />
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
        </Card>
      )}
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
