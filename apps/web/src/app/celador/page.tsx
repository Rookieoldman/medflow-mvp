import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getOrCreateDevCelador } from "@/lib/devUser";
import {
  assignToMe,
  setStatus,
  pauseTransfer,
  resumeTransfer,
} from "./serverActions";
import { initials } from "@/lib/patient";
import { StatusBadge } from "@/components/StatusBadge";
import { PriorityBadge } from "@/components/PriorityBadge";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CeladorPage() {
  const celador = await getOrCreateDevCelador();

  const available = await prisma.transfer.findMany({
    where: { status: "SOLICITADO", assignedToId: null },
    orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
    take: 30,
  });

  const mine = await prisma.transfer.findMany({
    where: { assignedToId: celador.id, status: { notIn: ["FINALIZADO"] } },
    orderBy: [{ priority: "desc" }, { updatedAt: "desc" }],
    take: 10,
  });

  return (
    <main className="p-6 space-y-10">
      {/* ===== HEADER ===== */}
      <header className="space-y-1">
        <h1 className="text-xl font-semibold">Celador</h1>
        <div className="text-xs text-gray-500 font-mono">
          user: {celador.email}
        </div>
      </header>

      

      {/* ===== MIS TRASLADOS ===== */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Mis traslados</h2>

        {mine.length === 0 ? (
          <p className="text-sm text-gray-600">No tienes traslados activos.</p>
        ) : (
          <div className="space-y-4">
            {mine.map((t) => (
              <div key={t.id} className="border rounded p-4 space-y-4">
                {/* Info principal */}
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="font-mono text-sm text-gray-700">
                      {t.mrn}
                    </div>

                    <div className="text-2xl font-semibold">
                      {initials(t.patientFullName)}
                    </div>

                    <div className="text-sm text-gray-600">
                      {t.location} → {t.testType}
                    </div>

                    <div className="flex gap-2 flex-wrap">
                      <PriorityBadge priority={t.priority} />
                      <StatusBadge status={t.status} />
                    </div>
                  </div>

                  <Link
                    className="underline text-sm whitespace-nowrap"
                    href={`/transfer/${t.id}`}
                  >
                    Ver detalle
                  </Link>
                </div>

                {/* Acciones por estado */}
                <div className="flex flex-wrap gap-2">
                  {t.status === "ASIGNADO" && (
                    <form action={setStatus}>
                      <input type="hidden" name="transferId" value={t.id} />
                      <input type="hidden" name="next" value="EN_CURSO" />
                      <button className="border px-3 py-2">
                        Iniciar traslado
                      </button>
                    </form>
                  )}

                  {t.status === "EN_CURSO" && (
                    <form action={setStatus}>
                      <input type="hidden" name="transferId" value={t.id} />
                      <input
                        type="hidden"
                        name="next"
                        value="EN_CAMINO_PRUEBA"
                      />
                      <button className="border px-3 py-2">
                        En camino a prueba
                      </button>
                    </form>
                  )}

                  {(t.status === "EN_CAMINO_PRUEBA" ||
                    t.status === "EN_ESPERA") && (
                    <form action={setStatus}>
                      <input type="hidden" name="transferId" value={t.id} />
                      <input type="hidden" name="next" value="EN_LA_PRUEBA" />
                      <button className="border px-3 py-2">En la prueba</button>
                    </form>
                  )}

                  {t.status === "EN_LA_PRUEBA" && (
                    <form action={setStatus}>
                      <input type="hidden" name="transferId" value={t.id} />
                      <input type="hidden" name="next" value="VUELTA" />
                      <button className="border px-3 py-2">
                        Iniciar vuelta
                      </button>
                    </form>
                  )}

                  {t.status === "VUELTA" && (
                    <form action={setStatus}>
                      <input type="hidden" name="transferId" value={t.id} />
                      <input type="hidden" name="next" value="FINALIZADO" />
                      <button className="border px-3 py-2">Finalizar</button>
                    </form>
                  )}

                  {t.status !== "PAUSADO" ? (
                    <form action={pauseTransfer}>
                      <input type="hidden" name="transferId" value={t.id} />
                      <button className="border px-3 py-2">Pausar</button>
                    </form>
                  ) : (
                    <form action={resumeTransfer}>
                      <input type="hidden" name="transferId" value={t.id} />
                      <button className="border px-3 py-2">Reanudar</button>
                    </form>
                  )}

                  <Link
                    className="border px-3 py-2"
                    href={`/celador/incidencia/${t.id}`}
                  >
                    Registrar incidencia
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
      {/* ===== DISPONIBLES ===== */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Traslados disponibles</h2>

        {available.length === 0 ? (
          <p className="text-sm text-gray-600">
            No hay traslados en SOLICITADO.
          </p>
        ) : (
          <div className="space-y-3">
            {available.map((t) => (
              <div
                key={t.id}
                className="border rounded p-4 grid grid-cols-[1fr_auto] gap-3"
              >
                <div className="space-y-1">
                  <div className="font-mono text-sm text-gray-700">{t.mrn}</div>

                  <div className="text-2xl font-semibold">
                    {initials(t.patientFullName)}
                  </div>

                  <div className="text-sm text-gray-600">
                    {t.location} → {t.testType}
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    <PriorityBadge priority={t.priority} />
                    <StatusBadge status={t.status} />
                  </div>
                </div>

                <form action={assignToMe} className="flex items-center">
                  <input type="hidden" name="transferId" value={t.id} />
                  <button
                    className="bg-blue-600 text-white px-3 py-2 text-sm"
                    type="submit"
                  >
                    Asignarme
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
