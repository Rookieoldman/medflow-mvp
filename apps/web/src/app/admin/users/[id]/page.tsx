import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { updateUser } from "./actions";

export const dynamic = "force-dynamic";

export default async function EditUserPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  // ✅ Resolver params correctamente
  const resolvedParams = await Promise.resolve(params as any);
  const id = resolvedParams?.id;

  if (!id) {
    return <main className="p-6">Falta id de usuario</main>;
  }

  const user = await prisma.user.findUnique({
    where: { id },
  });

  if (!user) {
    return <main className="p-6">Usuario no encontrado</main>;
  }

  return (
    <main className="p-6 max-w-xl space-y-6">
      <Link href="/admin/users" className="underline text-sm">
        ← Volver
      </Link>

      <h1 className="text-xl font-semibold">Editar usuario</h1>

      <form action={updateUser} className="space-y-4">
        <input type="hidden" name="id" value={user.id} />

        {/* Nombre */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            name="firstName"
            defaultValue={user.firstName ?? ""}
            placeholder="Nombre"
            className="border rounded-md p-2"
          />
          <input
            name="lastName1"
            defaultValue={user.lastName1 ?? ""}
            placeholder="1er apellido"
            className="border rounded-md p-2"
          />
          <input
            name="lastName2"
            defaultValue={user.lastName2 ?? ""}
            placeholder="2º apellido"
            className="border rounded-md p-2"
          />
        </div>

        {/* Email (solo lectura) */}
        <input
          value={user.email}
          disabled
          className="border rounded-md p-2 w-full bg-gray-100"
        />

        {/* Rol */}
        <select
          name="role"
          defaultValue={user.role}
          className="border rounded-md p-2 w-full"
        >
          <option value="TECNICO">Técnico</option>
          <option value="CELADOR">Celador</option>
          <option value="ADMIN">Admin</option>
        </select>

        {/* Turno */}
        <select
          name="shift"
          defaultValue={user.shift ?? ""}
          className="border rounded-md p-2 w-full"
        >
          <option value="">Sin turno</option>
          <option value="MANANA">Mañana</option>
          <option value="TARDE">Tarde</option>
          <option value="NOCHE">Noche</option>
        </select>

        {/* Activo */}
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="active"
            defaultChecked={user.active}
          />
          Usuario activo
        </label>

        <button
          type="submit"
          className="rounded-md bg-black text-white px-4 py-2 hover:bg-gray-800"
        >
          Guardar cambios
        </button>
      </form>
    </main>
  );
}