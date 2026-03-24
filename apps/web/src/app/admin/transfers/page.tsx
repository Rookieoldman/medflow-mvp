import { prisma } from "@/lib/prisma";
import AdminFilters from "./AdminFilters";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminPage({
  searchParams,
}: {
  searchParams:
    | Promise<{
        role?: string;
        userId?: string;
        status?: string;
        testType?: string;
      }>
    | {
        role?: string;
        userId?: string;
        status?: string;
        testType?: string;
      };
}) {
  // 🔑 CLAVE: resolver searchParams (Next 16)
  const resolvedSearchParams = await Promise.resolve(searchParams as any);

  const { role, userId, status, testType } = resolvedSearchParams ?? {};

  // 🔍 Construcción del WHERE
  const where: any = {};

  if (status) where.status = status;
  if (testType) where.testType = testType;

  if (role === "TECNICO" && userId) {
    where.createdById = userId;
  }

  if (role === "CELADOR" && userId) {
    where.assignedToId = userId;
  }

  const transfers = await prisma.transfer.findMany({
    where,
    include: {
      createdBy: true,
      assignedTo: true,
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const users = await prisma.user.findMany({
    where: role ? { role: role as any } : undefined,
    orderBy: { email: "asc" },
  });

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
                <th className="px-4 py-3">Ubicación</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Técnico</th>
                <th className="px-4 py-3">Celador</th>
                <th className="px-4 py-3 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {transfers.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{t.patientFullName}</div>
                    <div className="text-xs text-gray-400 font-mono">{t.mrn}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{t.location}</td>
                  <td className="px-4 py-3 text-gray-600">{t.testType}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                      {t.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{t.createdBy.email}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {t.assignedTo?.email ?? <span className="text-gray-300">—</span>}
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