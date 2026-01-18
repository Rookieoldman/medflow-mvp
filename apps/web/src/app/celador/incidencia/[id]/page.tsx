import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { createIncident } from "./serverActions";
import { StatusBadge } from "@/components/StatusBadge";
import { PriorityBadge } from "@/components/PriorityBadge";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function IncidenciaPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const resolved = await Promise.resolve(params as any);
  const id = resolved?.id;

  if (!id) return <main className="p-6">Falta id</main>;

  const transfer = await prisma.transfer.findUnique({
    where: { id },
  });

  if (!transfer) return <main className="p-6">Traslado no encontrado</main>;

  return (
    <main className="p-6 space-y-6 max-w-xl">
      <Link href={`/celador/transfer/${transfer.id}`} className="underline text-sm">
        ← Volver
      </Link>

      <h1 className="text-xl font-semibold">Registrar incidencia</h1>

      {/* ======================
          INFO DEL PACIENTE
      ======================= */}
      <section className="border rounded p-4 space-y-2 relative">
        <div className="absolute top-3 right-3 flex gap-2">
          <PriorityBadge priority={transfer.priority} />
          <StatusBadge status={transfer.status} />
        </div>

        <div className="font-mono text-sm">
          Nº historia: {transfer.mrn}
        </div>

        <div className="text-lg font-semibold">
          {transfer.patientFullName}
        </div>

        <div className="text-sm text-gray-600">
          Fecha nacimiento:{" "}
          {new Date(transfer.dob).toLocaleDateString("es-ES")}
        </div>

        <div className="text-sm text-gray-600">
          {transfer.location} → {transfer.testType}
        </div>
      </section>

      {/* ======================
          FORM INCIDENCIA
      ======================= */}
      <form action={createIncident} className="space-y-3">
        <input type="hidden" name="transferId" value={transfer.id} />

        <select
          name="type"
          className="border rounded p-2 w-full"
          defaultValue="PACIENTE_NO_PREPARADO"
        >
          <option value="PACIENTE_NO_PREPARADO">Paciente no preparado</option>
          <option value="ESPERA_CLINICA">Espera clínica</option>
          <option value="PRUEBA_CANCELADA">Prueba cancelada</option>
          <option value="OTRO">Otro</option>
        </select>

        <textarea
          name="note"
          className="border rounded p-2 w-full"
          placeholder="Observaciones (opcional)"
          rows={4}
        />

        <button
          className="bg-blue-600 text-white rounded px-4 py-2"
          type="submit"
        >
          Guardar incidencia
        </button>
      </form>
    </main>
  );
}