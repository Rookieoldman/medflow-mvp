import { prisma } from "@/lib/prisma";
import AdminFilters from "./AdminFilters";
import { DifficultyBadge } from "@/components/DifficultyBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { PriorityBadge } from "@/components/PriorityBadge";
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
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">Traslados</h2>

      <AdminFilters users={users} />

      {transfers.length === 0 ? (
        <div className="border rounded-xl p-10 text-center text-sm text-gray-400">
          No hay resultados con los filtros aplicados.
        </div>
      ) : (
        <div className="border rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr className="text-left text-gray-500 font-medium">
                <th className="px-4 py-3">Historia · Paciente</th>
                <th className="px-4 py-3">Dificultad</th>
                <th className="px-4 py-3">Prioridad</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Técnico</th>
                <th className="px-4 py-3">Celador</th>
                <th className="px-4 py-3 text-right" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {transfers.map((t) => (
                <tr
                  key={t.id}
                  className={`hover:bg-gray-50 transition-colors ${
                    t.difficulty === "CRITICO" ? "bg-red-50/40" : ""
                  }`}
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{t.patientFullName}</div>
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
                  <td className="px-4 py-3 text-gray-600 text-xs">
                    {TEST_LABELS[t.testType] ?? t.testType}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {t.createdBy
                      ? [t.createdBy.firstName, t.createdBy.lastName1].filter(Boolean).join(" ") || t.createdBy.email
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {t.assignedTo
                      ? [t.assignedTo.firstName, t.assignedTo.lastName1].filter(Boolean).join(" ") || t.assignedTo.email
                      : <span className="text-gray-300">Sin asignar</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/transfer/${t.id}`}
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Ver →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
