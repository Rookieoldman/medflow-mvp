import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/StatusBadge";
import { PriorityBadge } from "@/components/PriorityBadge";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CeladorTransferDetail({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const resolvedParams = await Promise.resolve(params as any);
  const id = resolvedParams?.id;

  if (!id) {
    return <main className="p-6">Falta el id en la URL.</main>;
  }

  const transfer = await prisma.transfer.findUnique({
    where: { id },
    include: {
      acceptance: true,
      incidents: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!transfer) {
    return <main className="p-6">Traslado no encontrado</main>;
  }

  return (
    <main className="p-6 space-y-6">
      <Link href="/celador" className="underline text-sm">
        ← Volver
      </Link>

      {/* ======================
          INFO PACIENTE (COMPLETA)
      ======================= */}
      <section className="relative border rounded p-4 space-y-2">
        <div className="absolute top-3 right-3 flex gap-2">
          <PriorityBadge priority={transfer.priority} />
          <StatusBadge status={transfer.status} />
        </div>

        <div className="font-mono text-sm">
          Nº historia: {transfer.mrn}
        </div>

        <div className="text-xl font-semibold">
          {transfer.patientFullName}
        </div>

        <div className="text-sm text-gray-600">
          Fecha nacimiento:{" "}
          {transfer.dob.toLocaleDateString("es-ES")}
        </div>

        <div className="text-sm text-gray-600">
          {transfer.location} → {transfer.testType}
        </div>

        {transfer.acceptance && (
          <div className="text-sm text-green-600 font-medium">
            ✔ Traslado aceptado por responsable
          </div>
        )}
      </section>

      {/* ======================
          INCIDENCIAS
      ======================= */}
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Incidencias</h2>

        {transfer.incidents.length === 0 ? (
          <p className="text-sm text-gray-600">No hay incidencias.</p>
        ) : (
          <ul className="space-y-2">
            {transfer.incidents.map((i) => (
              <li key={i.id} className="border rounded p-3">
                <div className="font-mono text-sm">{i.type}</div>
                {i.note && <div className="text-sm">{i.note}</div>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}