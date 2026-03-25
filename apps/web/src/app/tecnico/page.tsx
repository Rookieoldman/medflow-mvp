import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { redirect } from "next/navigation";
import { createTransfer } from "./actions/createTransfer";
import TecnicoClient from "./TecnicoClient";

export const dynamic = "force-dynamic";

const INPUT = "border border-gray-200 rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 bg-white";
const LABEL = "text-xs font-medium text-gray-500 uppercase tracking-wide";

export default async function TecnicoPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if ((session.user as any).role !== "TECNICO") redirect("/login");

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-5 sm:py-6">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-8">

        {/* FORMULARIO */}
        <section className="lg:col-span-2">
          <div className="border border-gray-200 rounded-xl bg-white shadow-sm p-5 lg:sticky lg:top-20">
            <h1 className="text-base font-semibold text-gray-900 mb-4">
              Solicitar traslado
            </h1>

            <form action={createTransfer} className="space-y-3.5">
              <div className="space-y-1">
                <label className={LABEL}>Nº Historia</label>
                <input name="mrn" placeholder="Ej. 123456" className={INPUT} required />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className={LABEL}>1er apellido</label>
                  <input name="lastName1" placeholder="García" className={INPUT} required />
                </div>
                <div className="space-y-1">
                  <label className={LABEL}>2º apellido</label>
                  <input name="lastName2" placeholder="López" className={INPUT} />
                </div>
              </div>

              <div className="space-y-1">
                <label className={LABEL}>Nombre</label>
                <input name="firstName" placeholder="María" className={INPUT} required />
              </div>

              <div className="space-y-1">
                <label className={LABEL}>Fecha de nacimiento</label>
                <input name="dob" type="date" className={INPUT} required />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className={LABEL}>Ámbito</label>
                  <select name="scope" className={INPUT} defaultValue="URGENCIAS" required>
                    <option value="URGENCIAS">Urgencias</option>
                    <option value="PLANTA">Planta</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className={LABEL}>Ubicación</label>
                  <input name="location" placeholder="UCI 3 / Planta 4B" className={INPUT} required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className={LABEL}>Tipo de prueba</label>
                  <select name="testType" className={INPUT}>
                    <option value="RX">RX</option>
                    <option value="TC">TC</option>
                    <option value="RM">RM</option>
                    <option value="ECO">Ecografía</option>
                    <option value="MEDICINA_NUCLEAR">Med. Nuclear</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className={LABEL}>Prioridad</label>
                  <select name="priority" className={INPUT} defaultValue="NORMAL">
                    <option value="NORMAL">Normal</option>
                    <option value="URGENTE">⚠ Urgente</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className={LABEL}>Dificultad del traslado</label>
                <select name="difficulty" className={INPUT} defaultValue="MODERADO" required>
                  <option value="BANAL">🟢 Banal — paciente autónomo</option>
                  <option value="MODERADO">🟡 Moderado — silla/camilla, estable</option>
                  <option value="CRITICO">🔴 Crítico — UCI, monitorización</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="requiresAcceptance"
                  name="requiresAcceptance"
                  className="rounded border-gray-300"
                />
                <label htmlFor="requiresAcceptance" className="text-sm text-gray-600">
                  Requiere firma del responsable de planta
                </label>
              </div>

              <button
                type="submit"
                className="w-full bg-gray-900 text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-gray-700 transition-colors mt-1"
              >
                Solicitar traslado
              </button>
            </form>
          </div>
        </section>

        {/* LISTA */}
        <section className="lg:col-span-3 space-y-4">
          <h2 className="text-base font-semibold text-gray-900">Mis solicitudes</h2>
          <TecnicoClient />
        </section>
      </div>
    </main>
  );
}
