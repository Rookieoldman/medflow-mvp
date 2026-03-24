import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { updateUser } from "./actions";

export const dynamic = "force-dynamic";

export default async function EditUserPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const resolvedParams = await Promise.resolve(params as any);
  const id = resolvedParams?.id;

  if (!id) {
    return <p className="p-6 text-sm text-gray-500">Falta id de usuario.</p>;
  }

  const user = await prisma.user.findUnique({ where: { id } });

  if (!user) {
    return <p className="p-6 text-sm text-gray-500">Usuario no encontrado.</p>;
  }

  return (
    <div className="max-w-xl space-y-6">
      <Link href="/admin/users" className="text-sm text-gray-500 hover:text-gray-800 transition-colors">
        ← Volver a usuarios
      </Link>

      <div>
        <h1 className="text-xl font-semibold">Editar usuario</h1>
        <p className="text-sm text-gray-500 mt-1">{user.email}</p>
      </div>

      <form action={updateUser} className="space-y-5 border rounded-xl p-6 shadow-sm bg-white">
        <input type="hidden" name="id" value={user.id} />

        {/* Nombre */}
        <fieldset className="space-y-3">
          <legend className="text-sm font-medium text-gray-700">Nombre completo</legend>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label htmlFor="firstName" className="text-xs text-gray-500">Nombre</label>
              <input
                id="firstName"
                name="firstName"
                defaultValue={user.firstName ?? ""}
                placeholder="Ej. Juan"
                className="border rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="lastName1" className="text-xs text-gray-500">Primer apellido</label>
              <input
                id="lastName1"
                name="lastName1"
                defaultValue={user.lastName1 ?? ""}
                placeholder="Ej. García"
                className="border rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
              />
            </div>
            <div className="space-y-1 col-span-2">
              <label htmlFor="lastName2" className="text-xs text-gray-500">Segundo apellido</label>
              <input
                id="lastName2"
                name="lastName2"
                defaultValue={user.lastName2 ?? ""}
                placeholder="Ej. López"
                className="border rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
              />
            </div>
          </div>
        </fieldset>

        {/* Email (solo lectura) */}
        <div className="space-y-1">
          <label className="text-xs text-gray-500">Email (no editable)</label>
          <input
            value={user.email}
            disabled
            className="border rounded-lg px-3 py-2 w-full text-sm bg-gray-50 text-gray-400 cursor-not-allowed"
          />
        </div>

        {/* Rol y estado */}
        <fieldset className="space-y-3">
          <legend className="text-sm font-medium text-gray-700">Rol y estado</legend>
          <div className="space-y-1">
            <label htmlFor="role" className="text-xs text-gray-500">Rol</label>
            <select
              id="role"
              name="role"
              defaultValue={user.role}
              className="border rounded-lg px-3 py-2 w-full text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-300"
            >
              <option value="TECNICO">Técnico</option>
              <option value="CELADOR">Celador</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>

          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              name="active"
              defaultChecked={user.active}
              className="w-4 h-4 rounded border-gray-300"
            />
            <span className="text-sm text-gray-700">Usuario activo</span>
          </label>
        </fieldset>

        <div className="pt-2 flex items-center gap-3">
          <button
            type="submit"
            className="rounded-lg bg-black text-white px-5 py-2 text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            Guardar cambios
          </button>
          <Link
            href="/admin/users"
            className="text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
