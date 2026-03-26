import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import ChangePasswordForm from "./ChangePasswordForm";

export const metadata: Metadata = {
  title: "Mi cuenta · MedFlow",
};

const ROLE_LABEL: Record<string, string> = {
  ADMIN:   "Administración",
  TECNICO: "Técnico",
  CELADOR: "Celador",
};

function homeHref(role: string) {
  if (role === "ADMIN") return "/admin";
  if (role === "CELADOR") return "/celador";
  return "/";
}

export default async function AccountPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const u    = session.user;
  const role = u.role ?? "";
  const name = [u.firstName, u.lastName1, u.lastName2].filter(Boolean).join(" ") || u.name || null;

  return (
    <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">
      <div>
        <Link
          href={homeHref(role)}
          className="text-sm text-gray-500 hover:text-gray-800 underline underline-offset-2"
        >
          ← Volver al panel
        </Link>
        <h1 className="mt-3 text-xl sm:text-2xl font-semibold text-gray-900">Mi cuenta</h1>
        <p className="text-sm text-gray-500 mt-1">
          Datos de tu usuario y cambio de contraseña.
        </p>
      </div>

      <section className="border border-gray-200 rounded-xl bg-white shadow-sm p-5 sm:p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Perfil</h2>
        <dl className="grid gap-3 text-sm">
          <div>
            <dt className="text-gray-500">Nombre</dt>
            <dd className="font-medium text-gray-900 mt-0.5">{name ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Correo</dt>
            <dd className="font-medium text-gray-900 mt-0.5 break-all">{u.email ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Rol</dt>
            <dd className="font-medium text-gray-900 mt-0.5">{ROLE_LABEL[role] ?? role}</dd>
          </div>
        </dl>
      </section>

      <section className="border border-gray-200 rounded-xl bg-white shadow-sm p-5 sm:p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
          Cambiar contraseña
        </h2>
        <p className="text-xs text-gray-500">
          Usa una contraseña segura que no reutilices en otros servicios.
        </p>
        <ChangePasswordForm />
      </section>
    </main>
  );
}
