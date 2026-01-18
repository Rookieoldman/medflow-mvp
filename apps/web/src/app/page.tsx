import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getOrCreateDevTecnico } from "@/lib/devUser";
import { createTransfer } from "./actions/createTransfer";
import { StatusBadge } from "@/components/StatusBadge";
import { initials } from "@/lib/patient";
import { PriorityBadge } from "@/components/PriorityBadge";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function TecnicoPage() {
  const tecnico = await getOrCreateDevTecnico();

  const transfers = await prisma.transfer.findMany({
    where: {
      createdById: tecnico.id,
      status: {
        not: "FINALIZADO",
      },
    },
    orderBy: [
      // 1️⃣ prioridad (URGENTE arriba)
      { priority: "desc" },

      // 2️⃣ antigüedad (más antiguos primero)
      { createdAt: "asc" },
    ],
  });

  return (
    <main className="p-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Columna izquierda: Formulario */}
        <section className="space-y-4 lg:col-span-1">
          <h1 className="text-xl font-semibold">
            Técnico · Solicitar traslado
          </h1>

          <form action={createTransfer} className="space-y-3 max-w-md">
            <input
              name="mrn"
              placeholder="Nº historia"
              className="border p-2 w-full"
            />

            <input
              name="lastName1"
              placeholder="1er apellido"
              className="border p-2 w-full"
            />

            <input
              name="lastName2"
              placeholder="2º apellido"
              className="border p-2 w-full"
            />

            <input
              name="firstName"
              placeholder="Nombre"
              className="border p-2 w-full"
            />

            <input name="dob" type="date" className="border p-2 w-full" />

            <input
              name="location"
              placeholder="Ubicación (ej. UCI 3)"
              className="border p-2 w-full"
            />

            <select name="testType" className="border p-2 w-full">
              <option value="RX">RX</option>
              <option value="RM">RM</option>
              <option value="ECO">ECO</option>
              <option value="MEDICINA_NUCLEAR">Medicina nuclear</option>
              <option value="TC">TC</option>
            </select>
            <select
              name="priority"
              className="border p-2 w-full"
              defaultValue="NORMAL"
            >
              <option value="NORMAL">Normal</option>
              <option value="URGENTE">Urgente</option>
            </select>

            <button className="bg-blue-600 text-white px-4 py-2" type="submit">
              Solicitar traslado
            </button>
          </form>
        </section>

        {/* Columna derecha: Mis solicitudes */}
        <section className="space-y-4 lg:col-span-2">
          <h2 className="text-lg font-semibold">Mis solicitudes</h2>

          {transfers.length === 0 ? (
            <p className="text-sm text-gray-600">Aún no hay solicitudes.</p>
          ) : (
            <div className="space-y-3">
              {transfers.map((t) => (
                <div
                  key={t.id}
                  className="border rounded p-4 grid grid-cols-[1fr_auto] gap-3"
                >
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

                  <div className="flex items-center">
                    <Link
                      href={`/transfer/${t.id}`}
                      className="underline text-sm whitespace-nowrap"
                    >
                      Ver
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
