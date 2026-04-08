import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createIncident } from "./serverActions";
import { Card, PageHeader } from "@/components/ui";
import { StatusBadge } from "@/components/StatusBadge";
import { PriorityBadge } from "@/components/PriorityBadge";
import { DifficultyBadge } from "@/components/DifficultyBadge";
import { fDate } from "@/lib/format";
import { celadorMayViewTransferDetail } from "@/lib/celadorTransferAccess";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const INPUT = "border border-gray-200 rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:ring-2 focus:ring-gray-300";

export default async function IncidenciaPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "CELADOR") redirect("/login");

  const { id } = await Promise.resolve(params as any);
  if (!id) return <main className="p-6">Falta id</main>;

  const transfer = await prisma.transfer.findUnique({ where: { id } });
  if (!transfer) return <main className="p-6">Traslado no encontrado</main>;

  if (!celadorMayViewTransferDetail(transfer, session.user.id)) {
    redirect("/celador");
  }

  /* Solo el celador asignado puede registrar incidencias (no en cola sin asignar). */
  if (transfer.assignedToId !== session.user.id) {
    redirect(`/celador/transfer/${id}`);
  }

  if (transfer.status === "FINALIZADO" || transfer.status === "CANCELADO") {
    redirect(`/celador/transfer/${id}`);
  }

  return (
    <main className="max-w-lg mx-auto px-4 sm:px-6 py-5 sm:py-6 space-y-5">
      <PageHeader
        title="Registrar incidencia"
        back={{ href: `/celador/transfer/${transfer.id}`, label: "Volver al traslado" }}
      />

      <Card>
        <div className="flex flex-wrap gap-2 mb-3">
          <StatusBadge     status={transfer.status} />
          <PriorityBadge   priority={transfer.priority} />
          <DifficultyBadge difficulty={transfer.difficulty} />
        </div>
        <p className="font-mono text-xs text-gray-400 mb-1">Nº Historia: {transfer.mrn}</p>
        <p className="text-sm text-gray-600 mt-1">
          El nombre completo y datos adicionales del paciente figuran en la{" "}
          <Link href={`/celador/transfer/${transfer.id}`} className="text-blue-600 font-medium hover:underline">
            ficha del traslado
          </Link>
          .
        </p>
        <p className="text-sm text-gray-500 mt-2">
          Nacimiento: {fDate(transfer.dob)} · {transfer.location} → {transfer.testType}
        </p>
      </Card>

      <Card>
        <h2 className="text-sm font-medium text-gray-700 mb-3">Tipo de incidencia</h2>
        <form action={createIncident} className="space-y-3">
          <input type="hidden" name="transferId" value={transfer.id} />

          <select name="type" className={INPUT} defaultValue="PACIENTE_NO_PREPARADO">
            <option value="PACIENTE_NO_PREPARADO">Paciente no preparado</option>
            <option value="ESPERA_CLINICA">Espera clínica</option>
            <option value="PRUEBA_CANCELADA">Prueba cancelada</option>
            <option value="OTRO">Otro</option>
          </select>

          <textarea
            name="note"
            className={`${INPUT} resize-none`}
            placeholder="Observaciones adicionales (opcional)"
            rows={4}
          />

          <button
            type="submit"
            className="w-full bg-orange-600 text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-orange-700 transition-colors"
          >
            Guardar incidencia
          </button>
        </form>
      </Card>
    </main>
  );
}
