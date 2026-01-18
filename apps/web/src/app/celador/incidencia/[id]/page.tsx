import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { createIncident } from "./serverActions";

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

  const transfer = await prisma.transfer.findUnique({ where: { id } });
  if (!transfer) return <main className="p-6">No encontrado</main>;

  return (
    <main className="p-6 space-y-6">
      <Link href="/celador" className="underline text-sm">
        ← Volver
      </Link>

      <h1 className="text-xl font-semibold">Registrar incidencia</h1>
      <div className="text-sm text-gray-700">
        {transfer.origin} → {transfer.destination} ·{" "}
        <span className="font-mono">{transfer.status}</span>
      </div>

      <form action={createIncident} className="space-y-3 max-w-md">
        <input type="hidden" name="transferId" value={transfer.id} />

        <select
          name="type"
          className="border p-2 w-full"
          defaultValue="PACIENTE_NO_PREPARADO"
        >
          <option value="PACIENTE_NO_PREPARADO">Paciente no preparado</option>
          <option value="ESPERA_CLINICA">Espera clínica</option>
          <option value="PRUEBA_CANCELADA">Prueba cancelada</option>
          <option value="OTRO">Otro</option>
        </select>

        <textarea
          name="note"
          className="border p-2 w-full"
          placeholder="Nota (opcional)"
        />

        <button className="bg-blue-600 text-white px-4 py-2" type="submit">
          Guardar incidencia
        </button>
      </form>
    </main>
  );
}
