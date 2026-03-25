import { prisma } from "@/lib/prisma";
import AdminFilters from "./AdminFilters";
import { DifficultyBadge } from "@/components/DifficultyBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { PriorityBadge } from "@/components/PriorityBadge";
import { PageHeader, EmptyState } from "@/components/ui";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const TEST_LABELS: Record<string, string> = {
  RM:               "RM",
  ECO:              "Eco",
  RX:               "RX",
  MEDICINA_NUCLEAR: "Med. Nuclear",
  TC:               "TC",
};

export default async function AdminTransfersPage({
  searchParams,
}: {
  searchParams:
    | Promise<{
        role?: string;
        userId?: string;
        status?: string;
        testType?: string;
        difficulty?: string;
      }>
    | {
        role?: string;
        userId?: string;
        status?: string;
        testType?: string;
        difficulty?: string;
      };
}) {
  const sp = await Promise.resolve(searchParams as any);
  const { role, userId, status, testType, difficulty } = sp ?? {};

  const where: any = {};
  if (status)     where.status     = status;
  if (testType)   where.testType   = testType;
  if (difficulty) where.difficulty = difficulty;

  if (role === "TECNICO" && userId) where.createdById  = userId;
  if (role === "CELADOR" && userId) where.assignedToId = userId;

  const [transfers, users] = await Promise.all([
    prisma.transfer.findMany({
      where,
      include: { createdBy: true, assignedTo: true },
      orderBy: [{ difficulty: "desc" }, { priority: "desc" }, { createdAt: "desc" }],
      take: 100,
    }),
    prisma.user.findMany({
      where: role ? { role: role as any } : undefined,
      orderBy: { email: "asc" },
    }),
  ]);

  return (
    <section className="space-y-5">
      <PageHeader
        title="Traslados"
        subtitle={`${transfers.length} resultado${transfers.length !== 1 ? "s" : ""}`}
      />

      <AdminFilters users={users} />

      {transfers.length === 0 ? (
        <EmptyState
          title="Sin resultados"
          subtitle="No hay traslados con los filtros aplicados"
          icon="🔍"
        />
      ) : (
        <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr className="text-left text-gray-500 font-medium">
                  <th className="px-4 py-3">Historia · Paciente</th>
                  <th className="px-4 py-3">Dificultad</th>
                  <th className="px-4 py-3">Prioridad</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 hidden md:table-cell">Tipo</th>
                  <th className="px-4 py-3 hidden lg:table-cell">Técnico</th>
                  <th className="px-4 py-3 hidden lg:table-cell">Celador</th>
                  <th className="px-4 py-3 text-right w-16" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {transfers.map((t) => (
                  <tr
                    key={t.id}
                    className={`hover:bg-gray-50 transition-colors ${
                      t.difficulty === "CRITICO" ? "bg-red-50/40" : ""
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 truncate max-w-[160px] sm:max-w-none">{t.patientFullName}</div>
                      <div className="text-xs text-gray-400 font-mono">{t.mrn}</div>
                    </td>
                    <td className="px-4 py-3">
                      <DifficultyBadge difficulty={t.difficulty} />
                    </td>
                    <td className="px-4 py-3">
                      <PriorityBadge priority={t.priority} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={t.status} />
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs hidden md:table-cell">
                      {TEST_LABELS[t.testType] ?? t.testType}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 hidden lg:table-cell">
                      {t.createdBy
                        ? [t.createdBy.firstName, t.createdBy.lastName1].filter(Boolean).join(" ") || t.createdBy.email
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 hidden lg:table-cell">
                      {t.assignedTo
                        ? [t.assignedTo.firstName, t.assignedTo.lastName1].filter(Boolean).join(" ") || t.assignedTo.email
                        : <span className="text-gray-300">Sin asignar</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/transfer/${t.id}`}
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium whitespace-nowrap"
                      >
                        Ver →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
