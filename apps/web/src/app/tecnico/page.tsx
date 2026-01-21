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
        {/* Formulario */}
        <section className="space-y-4 lg:col-span-1">
          <h1 className="text-xl font-semibold">
            Técnico · Solicitar traslado
          </h1>
          <form action={createTransfer} className="space-y-3">
            {/* Nº Historia */}
            <input
              name="mrn"
              placeholder="Nº historia"
              className="w-full rounded border p-2"
              required
            />

            {/* Apellidos y nombre */}
            <input
              name="lastName1"
              placeholder="1er apellido"
              className="w-full rounded border p-2"
              required
            />

            <input
              name="lastName2"
              placeholder="2º apellido"
              className="w-full rounded border p-2"
            />

            <input
              name="firstName"
              placeholder="Nombre"
              className="w-full rounded border p-2"
              required
            />

            {/* Fecha nacimiento */}
            <input
              name="dob"
              type="date"
              className="w-full rounded border p-2"
              required
            />

            {/* Ubicación */}
            <input
              name="location"
              placeholder="Ubicación (ej. UCI 3)"
              className="w-full rounded border p-2"
              required
            />

            {/* Tipo de prueba */}
            <select
              name="testType"
              className="w-full rounded border p-2"
              required
            >
              <option value="">Selecciona tipo de prueba</option>
              <option value="RX">RX</option>
              <option value="RM">RM</option>
              <option value="ECO">ECO</option>
              <option value="MEDICINA_NUCLEAR">Medicina nuclear</option>
              <option value="TC">TC</option>
            </select>

            {/* Prioridad */}
            <select
              name="priority"
              className="w-full rounded border p-2"
              defaultValue="NORMAL"
            >
              <option value="NORMAL">Normal</option>
              <option value="URGENTE">Urgente</option>
            </select>

            {/* Botón */}
            <button
              type="submit"
              className="w-full rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 transition"
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
