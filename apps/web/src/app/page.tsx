import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getOrCreateDevTecnico } from "@/lib/devUser";
import { createTransfer } from "./actions/createTransfer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function TecnicoPage() {
  const tecnico = await getOrCreateDevTecnico();

  const transfers = await prisma.transfer.findMany({
    where: { createdById: tecnico.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return (
    <main className="p-6 space-y-8">
      <section className="space-y-3">
        <h1 className="text-xl font-semibold">Técnico · Solicitar traslado</h1>

        <form action={createTransfer} className="space-y-3 max-w-md">
          <input
            name="origin"
            placeholder="Origen (ej. UCI)"
            className="border p-2 w-full"
          />
          <input
            name="destination"
            placeholder="Destino (ej. Radiología)"
            className="border p-2 w-full"
          />
          <button className="bg-blue-600 text-white px-4 py-2" type="submit">
            Solicitar traslado
          </button>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Mis solicitudes</h2>

        {transfers.length === 0 ? (
          <p className="text-sm text-gray-600">Aún no hay solicitudes.</p>
        ) : (
          <div className="space-y-2">
            {transfers.map((t) => (
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

                  {/* Debug: muestra la URL real */}
                  <div className="text-xs text-gray-500 font-mono">
                    /transfer/{t.id}
                  </div>
                </div>

                {/* Link “a prueba de balas” */}
                <a href={`/transfer/${t.id}`} className="underline text-sm">
                  Ver
                </a>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
