import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { redirect } from "next/navigation";
import AdminNav from "./AdminNav";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "ADMIN") redirect("/login");

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 sm:py-6 space-y-5">
      <header className="space-y-0.5">
        <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">
          Panel de administración
        </h1>
        <p className="text-sm text-gray-400">{session.user?.email}</p>
      </header>

      <AdminNav />

      <section>{children}</section>
    </div>
  );
}
