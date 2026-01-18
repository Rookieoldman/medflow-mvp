import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { createTransfer } from "./actions/createTransfer";
import { StatusBadge } from "@/components/StatusBadge";
import { PriorityBadge } from "@/components/PriorityBadge";
import { initials } from "@/lib/patient";

import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function TecnicoPage() {
  // 🔐 Sesión real
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  if (session.user.role !== "TECNICO") {
    redirect("/");
  }

  const tecnicoId = session.user.id;

  const transfers = await prisma.transfer.findMany({
    where: {
      createdById: tecnicoId,
      status: {
        not: "FINALIZADO",
      },
    },
    orderBy: [
      { priority: "desc" }, // URGENTE primero
      { createdAt: "asc" }, // más antiguos primero
    ],
  });

  return (
    <main className="p-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 🟦 Columna izquierda: formulario */}
        <section className="space-y-4 lg:col-span-1">
          <h1 className="text-xl font-semibold">
            Técnico · Solicitar traslado
          </h1>

          <form action={createTransfer} className="space-y-3">
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

            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-2"
            >
              Solicitar traslado
            </button>
          </form>
        </section>

        {/* 🟩 Columna derecha: mis solicitudes */}
        <section className="space-y-4 lg:col-span-2">
          <h2 className="text-lg font-semibold">Mis solicitudes</h2>

          {transfers.length === 0 ? (
            <p className="text-sm text-gray-600">
              Aún no hay solicitudes.
            </p>
          ) : (
            <div className="space-y-3">
              {transfers.map((t) => (
                <div
                  key={t.id}
                  className="border rounded p-4 grid grid-cols-[1fr_auto] gap-3"
                >
                  <div className="space-y-1">
                    <div className="font-mono text-sm text-gray-500">
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