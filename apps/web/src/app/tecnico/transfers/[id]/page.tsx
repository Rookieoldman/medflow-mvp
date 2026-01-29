import { prisma } from "@/lib/prisma";
import { markEnLaPrueba, cancelPrueba } from "./serverActions";
import CancelPruebaButton from "./CancelPruebaButton";
import { getOrCreateDevTecnico, getOrCreateDevCelador } from "@/lib/devUser";
import { initials } from "@/lib/patient";
import { StatusBadge } from "@/components/StatusBadge";
import { PriorityBadge } from "@/components/PriorityBadge";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function TransferDetail({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const resolvedParams = await Promise.resolve(params as any);
  const id = resolvedParams?.id;

  if (!id) {
    return <main className="p-6">Falta el id en la URL.</main>;
  }

  const transfer = await prisma.transfer.findUnique({
    where: { id },
    include: {
      incidents: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!transfer) {
    return <main className="p-6">Traslado no encontrado</main>;
  }

  // 👤 Usuarios DEV (MVP)
  const tecnico = await getOrCreateDevTecnico();
  const celador = await getOrCreateDevCelador();

  const isCreator = transfer.createdById === tecnico.id;
  const isAssignedCelador = transfer.assignedToId === celador.id;

  const canSeeSensitiveData = isCreator || isAssignedCelador;

  const isFinal =
    transfer.status === "FINALIZADO" || transfer.status === "CANCELADO";

  const canMarkEnLaPrueba =
    !isFinal &&
    (transfer.status === "EN_CAMINO_PRUEBA" || transfer.status === "EN_ESPERA");

  const canCancel =
    !isFinal &&
    (transfer.status === "ASIGNADO" ||
      transfer.status === "EN_CURSO" ||
      transfer.status === "EN_CAMINO_PRUEBA" ||
      transfer.status === "EN_ESPERA" ||
      transfer.status === "EN_LA_PRUEBA");

  const backHref = isCreator ? "/tecnico" : "/celador";

  return (
    <main className="p-6 space-y-6">
      {/* VOLVER */}
      <a href={backHref} className="underline text-sm">
        ← Volver
      </a>

      {/* ======================
          CABECERA
      ====================== */}
      <header className="space-y-3 border rounded p-4 relative">
        {/* MRN */}
        <div className="font-mono text-sm text-gray-600">
          Nº historia: {transfer.mrn}
        </div>

        {/* INICIALES */}
        <div className="text-3xl font-semibold">
          {initials(transfer.patientFullName)}
        </div>

        {/* UBICACIÓN */}
        <div className="text-lg text-gray-700">
          {transfer.location} → {transfer.testType}
        </div>

        {/* BADGES */}
        <div className="flex gap-2 flex-wrap">
          <PriorityBadge priority={transfer.priority} />
          <StatusBadge status={transfer.status} />
        </div>

        {/* MENSAJE FINAL */}
        {isFinal && (
          <div className="mt-3 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
            Este traslado está{" "}
            {transfer.status === "CANCELADO" ? "cancelado" : "finalizado"} y no
            admite más acciones.
          </div>
        )}

        {/* DATOS SENSIBLES */}
        {canSeeSensitiveData ? (
          <div className="mt-4 border-t pt-4 space-y-1">
            <div>
              <span className="font-semibold">Paciente:</span>{" "}
              {transfer.patientFullName}
            </div>
            <div>
              <span className="font-semibold">Fecha nacimiento:</span>{" "}
              {transfer.dob.toLocaleDateString("es-ES")}
            </div>
          </div>
        ) : (
          <div className="mt-4 text-sm text-gray-500 italic">
            Datos personales ocultos. Asígnate el traslado para verlos.
          </div>
        )}
      </header>

      {/* ======================
          ACCIONES
      ====================== */}
      {canMarkEnLaPrueba && (
        <form action={markEnLaPrueba}>
          <input type="hidden" name="transferId" value={transfer.id} />
          <button className="bg-green-600 text-white px-4 py-2 rounded">
            Marcar “En la prueba”
          </button>
        </form>
      )}

      {canCancel && (
        <CancelPruebaButton transferId={transfer.id} action={cancelPrueba} />
      )}

      {/* ======================
          INCIDENCIAS
      ====================== */}
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Incidencias</h2>

        {transfer.incidents.length === 0 ? (
          <p className="text-sm text-gray-600">No hay incidencias.</p>
        ) : (
          <ul className="space-y-2">
            {transfer.incidents.map((i) => (
              <li key={i.id} className="border rounded p-3">
                <div className="font-mono text-sm">{i.type}</div>
                {i.note && <div className="text-sm">{i.note}</div>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
