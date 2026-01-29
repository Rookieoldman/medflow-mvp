import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { redirect } from "next/navigation";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session || (session.user as any).role !== "ADMIN") {
    redirect("/login");
  }

  return (
    <main className="p-6 space-y-6">
      {/* HEADER */}
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Panel de administración</h1>
        <p className="text-sm text-gray-500">
          Usuario: {session.user?.email}
        </p>
      </header>

      {/* PESTAÑAS */}
      <nav className="flex gap-4 border-b pb-2">
        <AdminTab href="/admin/users" label="Usuarios" />
        <AdminTab href="/admin" label="Traslados" />
        <AdminTab href="/admin/stats/globalStats" label="Estadísticas" />
      </nav>

      {/* CONTENIDO */}
      <section>{children}</section>
    </main>
  );
}

function AdminTab({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="px-3 py-2 text-sm border-b-2 border-transparent hover:border-gray-400"
    >
      {label}
    </Link>
  );
}