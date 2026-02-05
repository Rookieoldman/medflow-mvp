import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { redirect } from "next/navigation";
import { createTransfer } from "./actions/createTransfer";
import TecnicoClient from "./TecnicoClient";

export const dynamic = "force-dynamic";

export default async function TecnicoPage() {
  const session = await getServerSession(authOptions);
  console.log("SESSION TECNICO:", session);

  if (!session) redirect("/login");
  if (session.user.role !== "TECNICO") redirect("/login");

  return (
    <main className="p-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ======================
            FORMULARIO
        ====================== */}
        <section className="space-y-4 lg:col-span-1">
          <h1 className="text-xl font-semibold">
            Técnico · Solicitar traslado
          </h1>

          <form action={createTransfer} className="space-y-3">
            <input
              name="mrn"
              placeholder="Nº historia"
              className="border rounded p-2 w-full"
              required
            />

            <input
              name="lastName1"
              placeholder="1er apellido"
              className="border rounded p-2 w-full"
              required
            />

            <input
              name="lastName2"
              placeholder="2º apellido"
              className="border rounded p-2 w-full"
            />

            <input
              name="firstName"
              placeholder="Nombre"
              className="border rounded p-2 w-full"
              required
            />

            <input
              name="dob"
              type="date"
              className="border rounded p-2 w-full"
              required
            />

            {/* 🔹 NUEVO: ÁMBITO */}
            <select
              name="scope"
              className="border p-2 w-full rounded"
              required
              defaultValue="URGENCIAS"
            >
              <option value="URGENCIAS">Urgencias</option>
              <option value="PLANTA">Planta</option>
            </select>

            {/* Ubicación específica */}
            <input
              name="location"
              placeholder="Ubicación (ej. UCI 3 / Planta 4B)"
              className="border p-2 w-full rounded"
              required
            />

            <select name="testType" className="border p-2 w-full rounded">
              <option value="RX">RX</option>
              <option value="TC">TC</option>
              <option value="RM">RM</option>
              <option value="ECO">ECO</option>
              <option value="MEDICINA_NUCLEAR">
                Medicina nuclear
              </option>
            </select>

            <select
              name="priority"
              className="border p-2 w-full rounded"
              defaultValue="NORMAL"
            >
              <option value="NORMAL">Normal</option>
              <option value="URGENTE">Urgente</option>
            </select>

            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-2 rounded"
            >
              Solicitar traslado
            </button>
          </form>
        </section>
        {/* Lista reactiva */}
        <section className="space-y-4 lg:col-span-2">
          <h2 className="text-lg font-semibold">Mis solicitudes</h2>
          <TecnicoClient />
        </section>
      </div>
    </main>
  );
}
