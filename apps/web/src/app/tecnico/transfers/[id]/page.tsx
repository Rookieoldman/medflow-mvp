import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { redirect } from "next/navigation";
import { cancelPrueba } from "./serverActions";
import CancelPruebaButton from "./CancelPruebaButton";
import { initials } from "@/lib/patient";
import { StatusBadge } from "@/components/StatusBadge";
import { PriorityBadge } from "@/components/PriorityBadge";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const INCIDENT_LABELS: Record<string, string> = {
  PACIENTE_NO_PREPARADO: "Paciente no preparado",
  ESPERA_CLINICA:        "Espera clínica",
  PRUEBA_CANCELADA:      "Prueba cancelada",
  OTRO:                  "Otro",
};

export default async function TransferDetail({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const resolvedParams = await Promise.resolve(params as any);
  const id = resolvedParams?.id;
  if (!id) return <main className="p-6">Falta el id en la URL.</main>;

  const transfer = await prisma.transfer.findUnique({
    where: { id },
    include: {
      incidents: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!transfer) return <main className="p-6">Traslado no encontrado.</main>;

  const isCreator = transfer.createdById === session.user.id;
  const isFinal = transfer.status === "FINALIZADO" || transfer.status === "CANCELADO";

  // Solo el técnico que creó el traslado puede ver los datos sensibles
  const canSeeSensitiveData = isCreator;

  // Estados activos según schema actual
  const canCancel =
    !isFinal &&
    isCreator &&
    ["SOLICITADO", "ASIGNADO", "EN_CURSO", "EN_PRUEBA", "PAUSADO"].includes(
      transfer.status
    );

  return (
    <main className="p-6 space-y-6 max-w-2xl">
      <Link href="/tecnico" className="text-sm text-gray-500 hover:text-gray-800 transition-colors">
        ← Volver
      </Link>

      {/* ── CABECERA ── */}
      <header className="border rounded-xl p-5 space-y-3 bg-white shadow-sm">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="space-y-1">
            <div className="font-mono text-sm text-gray-500">
              Nº historia: {transfer.mrn}
            </div>
            <div className="text-3xl font-semibold">
              {initials(transfer.patientFullName)}
            </div>
            <div className="text-gray-600">
              {transfer.location} → {transfer.testType}
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <PriorityBadge priority={transfer.priority} />
            <StatusBadge status={transfer.status} />
          </div>
        </div>

        {isFinal && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            Este traslado está{" "}
            {transfer.status === "CANCELADO" ? "cancelado" : "finalizado"} y no
            admite más acciones.
          </div>
        )}

        {canSeeSensitiveData ? (
          <div className="border-t pt-3 space-y-1 text-sm">
            <div>
              <span className="font-medium">Paciente:</span>{" "}
              {transfer.patientFullName}
            </div>
            <div>
              <span className="font-medium">Fecha de nacimiento:</span>{" "}
              {transfer.dob.toLocaleDateString("es-ES")}
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-400 italic border-t pt-3">
            Datos personales ocultos — no eres el creador de este traslado.
          </p>
        )}
      </header>

      {/* ── ACCIONES ── */}
      {canCancel && (
        <CancelPruebaButton transferId={transfer.id} action={cancelPrueba} />
      )}

      {/* ── INCIDENCIAS ── */}
      <section className="space-y-3">
        <h2 className="font-semibold text-gray-800">
          Incidencias · {transfer.incidents.length}
        </h2>

        {transfer.incidents.length === 0 ? (
          <p className="text-sm text-gray-400 italic">Sin incidencias registradas.</p>
        ) : (
          <ul className="space-y-2">
            {transfer.incidents.map((i) => (
              <li key={i.id} className="border rounded-lg p-3 text-sm space-y-1">
                <div className="font-medium text-gray-800">
                  {INCIDENT_LABELS[i.type] ?? i.type}
                </div>
                {i.note && <div className="text-gray-600">{i.note}</div>}
                <div className="text-xs text-gray-400">
                  {i.createdAt.toLocaleString("es-ES")}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
