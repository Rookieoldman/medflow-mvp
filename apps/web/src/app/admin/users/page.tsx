import { prisma } from "@/lib/prisma";
import UserRow from "./UserRow";
import Link from "next/link";
import { PageHeader, EmptyState, Pagination } from "@/components/ui";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const PAGE_SIZE = 20;

const ROLE_CONFIG = {
  ADMIN:    { label: "Admins",    color: "bg-purple-100 text-purple-800 border-purple-200" },
  TECNICO:  { label: "Técnicos",  color: "bg-blue-100 text-blue-800 border-blue-200" },
  CELADOR:  { label: "Celadores", color: "bg-green-100 text-green-800 border-green-200" },
};

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>> | Record<string, string>;
}) {
  const params     = await Promise.resolve(searchParams as any);
  const activeRole = params?.role as string | undefined;
  const page       = Math.max(1, parseInt(params?.page ?? "1", 10));

  const where = activeRole ? { role: activeRole as any } : undefined;

  const [total, users, roleCounts] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: [{ role: "asc" }, { lastName1: "asc" }],
      skip:    (page - 1) * PAGE_SIZE,
      take:    PAGE_SIZE,
      select:  {
        id: true, email: true, role: true, firstName: true,
        lastName1: true, lastName2: true, active: true,
        createdAt: true, breakUntil: true, activeShift: true,
      },
    }),
    prisma.user.groupBy({ by: ["role"], _count: { _all: true } }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const countByRole = Object.fromEntries(
    roleCounts.map((r) => [r.role, r._count._all])
  );

  function buildHref(p: number) {
    const params = new URLSearchParams();
    if (activeRole) params.set("role", activeRole);
    if (p > 1)      params.set("page", String(p));
    return `/admin/users?${params.toString()}`;
  }

  return (
    <section className="space-y-5">

      <PageHeader
        title="Usuarios"
        subtitle="Gestiona técnicos, celadores y administradores"
        action={
          <Link
            href="/admin/users/new"
            className="rounded-lg bg-gray-900 text-white px-4 py-2 text-sm hover:bg-gray-700 transition-colors"
          >
            + Crear usuario
          </Link>
        }
      />

      {/* ── RESUMEN POR ROL ── */}
      <div className="flex gap-3 flex-wrap">
        <Link
          href="/admin/users"
          className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
            !activeRole
              ? "bg-gray-900 text-white border-gray-900"
              : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
          }`}
        >
          Todos · {Object.values(countByRole).reduce((a, b) => a + b, 0)}
        </Link>

        {(["ADMIN", "TECNICO", "CELADOR"] as const).map((role) => {
          const cfg = ROLE_CONFIG[role];
          const isActive = activeRole === role;
          return (
            <Link
              key={role}
              href={`/admin/users?role=${role}`}
              className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                isActive
                  ? cfg.color + " border-current"
                  : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
              }`}
            >
              {cfg.label} · {countByRole[role] ?? 0}
            </Link>
          );
        })}
      </div>

      {users.length === 0 ? (
        <EmptyState title="No hay usuarios" subtitle="No hay usuarios con este filtro" icon="👤" />
      ) : (
        <>
          <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[480px]">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr className="text-left text-gray-500 font-medium">
                    <th className="px-4 py-3">Nombre</th>
                    <th className="px-4 py-3 hidden sm:table-cell">Email</th>
                    <th className="px-4 py-3">Rol</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3 hidden md:table-cell">Alta</th>
                    <th className="px-4 py-3">Turno</th>
                    <th className="px-4 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {users.map((u) => (
                    <UserRow key={u.id} user={u} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <Pagination
            page={page}
            totalPages={totalPages}
            total={total}
            pageSize={PAGE_SIZE}
            buildHref={buildHref}
          />
        </>
      )}
    </section>
  );
}
