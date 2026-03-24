import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { redirect } from "next/navigation";
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

export default async function CeladorTransferDetail({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "CELADOR") redirect("/login");

  const resolvedParams = await Promise.resolve(params as any);
  const id = resolvedParams?.id;
  if (!id) return <main className="p-6">Falta el id en la URL.</main>;

  const transfer = await prisma.transfer.findUnique({
    where: { id },
    include: {
      acceptance: true,
      incidents: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!transfer) return <main className="p-6">Traslado no encontrado.</main>;

  // Solo el celador asignado puede ver el detalle completo
  if (transfer.assignedToId && transfer.assignedToId !== session.user.id) {
    redirect("/celador");
  }

  return (
    <main className="p-6 space-y-6 max-w-2xl">
      <Link href="/celador" className="text-sm text-gray-500 hover:text-gray-800 transition-colors">
        ← Volver
      </Link>

      {/* ── DATOS DEL PACIENTE ── */}
      <section className="border rounded-xl p-5 bg-white shadow-sm space-y-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="space-y-1">
            <div className="font-mono text-sm text-gray-500">
              Nº historia: {transfer.mrn}
            </div>
            <div className="text-xl font-semibold text-gray-900">
              {transfer.patientFullName}
            </div>
            <div className="text-sm text-gray-600">
              Fecha nacimiento:{" "}
              {transfer.dob.toLocaleDateString("es-ES")}
            </div>
            <div className="text-sm text-gray-600">
              {transfer.location} → {transfer.testType}
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <PriorityBadge priority={transfer.priority} />
            <StatusBadge status={transfer.status} />
          </div>
        </div>

        {transfer.acceptance && (
          <div className="flex items-center gap-2 text-sm text-green-700 font-medium border-t pt-3">
            <span>✔</span>
            <span>Traslado aceptado por responsable de planta</span>
          </div>
        )}
      </section>

      {/* ── ENLACE INCIDENCIA ── */}
      {transfer.assignedToId === session.user.id &&
        transfer.status !== "FINALIZADO" &&
        transfer.status !== "CANCELADO" && (
          <Link
            href={`/celador/incidencia/${transfer.id}`}
            className="inline-flex items-center gap-2 border rounded-lg px-4 py-2 text-sm text-orange-700 border-orange-200 bg-orange-50 hover:bg-orange-100 transition-colors"
          >
            + Registrar incidencia
          </Link>
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
                {i.note && <p className="text-gray-600">{i.note}</p>}
                <p className="text-xs text-gray-400">
                  {i.createdAt.toLocaleString("es-ES")}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
