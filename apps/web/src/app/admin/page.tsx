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
    <main className="p-6 space-y-6">
      <h1 className="text-xl font-semibold">Admin · Traslados</h1>

      <AdminFilters users={users} />

      {transfers.length === 0 ? (
        <p className="text-sm text-gray-600">No hay resultados.</p>
      ) : (
        <div className="space-y-2">
          {transfers.map((t) => (
            <div
              key={t.id}
              className="border rounded p-3 flex justify-between"
            >
              <div className="space-y-1 text-sm">
                <div className="font-mono">
                  {t.mrn} · {t.patientFullName}
                </div>
                <div>
                  {t.location} → {t.testType}
                </div>
                <div className="text-xs text-gray-500">
                  Estado: {t.status}
                </div>
                <div className="text-xs text-gray-500">
                  Técnico: {t.createdBy.email}
                  {t.assignedTo && ` · Celador: ${t.assignedTo.email}`}
                </div>
              </div>

              <Link
                href={`/admin/transfer/${t.id}`}
                className="underline text-sm"
              >
                Ver detalle
              </Link>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}