import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  SOLICITADO: { label: "Solicitado", color: "bg-amber-100 text-amber-800" },
  ASIGNADO:   { label: "Asignado",   color: "bg-blue-100 text-blue-800"   },
  EN_CURSO:   { label: "En curso",   color: "bg-indigo-100 text-indigo-800" },
  EN_PRUEBA:  { label: "En prueba",  color: "bg-purple-100 text-purple-800" },
  PAUSADO:    { label: "Pausado",    color: "bg-gray-100 text-gray-700"   },
  FINALIZADO: { label: "Finalizado", color: "bg-green-100 text-green-800"  },
  CANCELADO:  { label: "Cancelado",  color: "bg-red-100 text-red-700"     },
};

const INCIDENT_LABELS: Record<string, string> = {
  PACIENTE_NO_PREPARADO: "Paciente no preparado",
  ESPERA_CLINICA:        "Espera clínica",
  PRUEBA_CANCELADA:      "Prueba cancelada",
  OTRO:                  "Otro",
};

export default async function AdminTransferDetail({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const resolvedParams = await Promise.resolve(params as any);
  const id = resolvedParams?.id;

  if (!id) return <p className="text-sm text-gray-500">Falta el id en la URL.</p>;

  const transfer = await prisma.transfer.findUnique({
    where: { id },
    include: {
      createdBy: true,
      assignedTo: true,
      acceptance: true,
      incidents: {
        include: { createdBy: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!transfer) return <p className="text-sm text-gray-500">Traslado no encontrado.</p>;

  const statusCfg = STATUS_LABELS[transfer.status] ?? { label: transfer.status, color: "bg-gray-100 text-gray-700" };

  return (
    <div className="space-y-5 max-w-3xl">
      <Link
        href="/admin/transfers"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors"
      >
        ← Volver a traslados
      </Link>

      {/* ── CABECERA ── */}
      <div className="border rounded-xl p-5 bg-white shadow-sm space-y-1">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{transfer.patientFullName}</h1>
            <p className="text-sm text-gray-500 font-mono">{transfer.mrn}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium shrink-0 ${statusCfg.color}`}>
            {statusCfg.label}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* ── DATOS CLÍNICOS ── */}
        <div className="border rounded-xl p-5 bg-white shadow-sm space-y-3">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Datos clínicos</h2>
          <dl className="space-y-2 text-sm">
            <Row label="Fecha de nacimiento" value={transfer.dob.toLocaleDateString("es-ES")} />
            <Row label="Ubicación" value={transfer.location} />
            <Row label="Tipo de prueba" value={transfer.testType} />
            <Row
              label="Prioridad"
              value={
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  transfer.priority === "URGENTE"
                    ? "bg-red-100 text-red-700"
                    : "bg-gray-100 text-gray-600"
                }`}>
                  {transfer.priority}
                </span>
              }
            />
            <Row label="Creado" value={transfer.createdAt.toLocaleString("es-ES")} />
          </dl>
        </div>

        {/* ── RESPONSABLES ── */}
        <div className="border rounded-xl p-5 bg-white shadow-sm space-y-3">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Responsables</h2>
          <dl className="space-y-2 text-sm">
            <Row label="Técnico" value={transfer.createdBy.email} />
            <Row
              label="Celador"
              value={transfer.assignedTo?.email ?? <span className="text-gray-400 italic">Sin asignar</span>}
            />
          </dl>
        </div>
      </div>

      {/* ── ACEPTACIÓN / FIRMA ── */}
      <div className="border rounded-xl p-5 bg-white shadow-sm space-y-3">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Aceptación del traslado</h2>
        {!transfer.acceptance ? (
          <p className="text-sm text-gray-400 italic">Pendiente de aceptación.</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <dl className="space-y-2">
              <Row label="Firmante" value={transfer.acceptance.signerName} />
              {transfer.acceptance.signerRole && (
                <Row label="Rol firmante" value={transfer.acceptance.signerRole} />
              )}
              <Row label="Fecha de firma" value={transfer.acceptance.signedAt.toLocaleString("es-ES")} />
            </dl>
            <div>
              <p className="text-xs text-gray-500 mb-2">Firma</p>
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
      </div>

      {/* ── INCIDENCIAS ── */}
      <div className="border rounded-xl p-5 bg-white shadow-sm space-y-3">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Incidencias · {transfer.incidents.length}
        </h2>
        {transfer.incidents.length === 0 ? (
          <p className="text-sm text-gray-400 italic">Sin incidencias registradas.</p>
        ) : (
          <ul className="space-y-2">
            {transfer.incidents.map((i) => (
              <li key={i.id} className="border rounded-lg p-3 text-sm space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-800">
                    {INCIDENT_LABELS[i.type] ?? i.type}
                  </span>
                  <span className="text-xs text-gray-400">
                    {i.createdAt.toLocaleString("es-ES")}
                  </span>
                </div>
                {i.note && <p className="text-gray-600 text-sm">{i.note}</p>}
                {i.createdBy && (
                  <p className="text-xs text-gray-400">{i.createdBy.email}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-gray-400 shrink-0">{label}</dt>
      <dd className="text-gray-800 text-right">{value}</dd>
    </div>
  );
}
