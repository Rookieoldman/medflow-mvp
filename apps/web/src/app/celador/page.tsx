import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getOrCreateDevCelador } from "@/lib/devUser";
import {
  assignToMe,
  nextStatus,
  pauseTransfer,
  resumeTransfer,
} from "./serverActions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CeladorPage() {
  const celador = await getOrCreateDevCelador();

  const available = await prisma.transfer.findMany({
    where: { status: "SOLICITADO", assignedToId: null },
    orderBy: { createdAt: "asc" },
    take: 30,
  });

  const mine = await prisma.transfer.findMany({
    where: { assignedToId: celador.id, status: { notIn: ["FINALIZADO"] } },
    orderBy: { updatedAt: "desc" },
    take: 10,
  });

  return (
    <main className="p-6 space-y-10">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold">Celador</h1>
        <div className="text-xs text-gray-500 font-mono">
          user: {celador.email}
        </div>
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Traslados disponibles</h2>

        {available.length === 0 ? (
          <p className="text-sm text-gray-600">
            No hay traslados en SOLICITADO.
          </p>
        ) : (
          <div className="space-y-2">
            {available.map((t) => (
              <div
                key={t.id}
                className="border rounded p-3 flex items-center justify-between"
              >
                <div>
                  <div className="font-medium">
                    {t.origin} → {t.destination}
                  </div>
                  <div className="text-sm text-gray-600">
                    Estado: <span className="font-mono">{t.status}</span>
                  </div>
                  <div className="text-xs text-gray-500 font-mono">{t.id}</div>
                </div>

                <form action={assignToMe}>
                  <input type="hidden" name="transferId" value={t.id} />
                  <button
                    className="bg-blue-600 text-white px-3 py-2"
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

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Mis traslados</h2>

        {mine.length === 0 ? (
          <p className="text-sm text-gray-600">No tienes traslados activos.</p>
        ) : (
          <div className="space-y-2">
            {mine.map((t) => (
              <div key={t.id} className="border rounded p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">
                      {t.origin} → {t.destination}
                    </div>
                    <div className="text-sm text-gray-600">
                      Estado: <span className="font-mono">{t.status}</span>
                    </div>
                    <div className="text-xs text-gray-500 font-mono">
                      {t.id}
                    </div>
                  </div>

                  <Link
                    className="underline text-sm"
                    href={`/transfer/${t.id}`}
                  >
                    Ver detalle
                  </Link>
                </div>

                <div className="flex flex-wrap gap-2">
                  <form action={nextStatus}>
                    <input type="hidden" name="transferId" value={t.id} />
                    <button className="border px-3 py-2" type="submit">
                      Siguiente estado
                    </button>
                  </form>

                  {t.status !== "PAUSADO" ? (
                    <form action={pauseTransfer}>
                      <input type="hidden" name="transferId" value={t.id} />
                      <button className="border px-3 py-2" type="submit">
                        Pausar
                      </button>
                    </form>
                  ) : (
                    <form action={resumeTransfer}>
                      <input type="hidden" name="transferId" value={t.id} />
                      <button className="border px-3 py-2" type="submit">
                        Reanudar
                      </button>
                    </form>
                  )}

                  <Link
                    className="border px-3 py-2"
                    href={`/celador/incidencia/${t.id}`}
                  >
                    Registrar incidencia
                  </Link>
                </div>

                <p className="text-xs text-gray-500">
                  “Siguiente estado” avanza por el flujo básico. (Luego lo
                  refinamos con botones específicos.)
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
