import Link from "next/link";
import { createUser } from "./actions";

export const dynamic = "force-dynamic";

export default function NewUserPage() {
  return (
    <main className="p-6 max-w-xl space-y-6">
      <Link href="/admin/users" className="underline text-sm">
        ← Volver
      </Link>

      <h1 className="text-xl font-semibold">Crear usuario</h1>

      <form action={createUser} className="space-y-4">
        {/* Nombre */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            name="firstName"
            placeholder="Nombre"
            className="border rounded-lg p-2"
          />
          <input
            name="lastName1"
            placeholder="1er apellido"
            className="border rounded-lg p-2"
          />
          <input
            name="lastName2"
            placeholder="2º apellido"
            className="border rounded-lg p-2 md:col-span-2"
          />
        </div>

        {/* Email */}
        <input
          name="email"
          type="email"
          placeholder="Email"
          className="border rounded-lg p-2 w-full"
          required
        />

        {/* Password */}
        <input
          name="password"
          type="password"
          placeholder="Contraseña"
          className="border rounded-lg p-2 w-full"
          required
        />

        {/* Rol */}
        <select
          name="role"
          className="border rounded-lg p-2 w-full"
          required
        >
          <option value="">Selecciona rol</option>
          <option value="TECNICO">Técnico</option>
          <option value="CELADOR">Celador</option>
          <option value="ADMIN">Admin</option>
        </select>

        {/* Turno */}
        <select name="shift" className="border rounded-lg p-2 w-full">
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
            defaultChecked
            className="rounded"
          />
          Usuario activo
        </label>

        {/* Submit */}
        <button
          type="submit"
          className="rounded-lg bg-black text-white px-4 py-2 hover:bg-gray-800 transition"
        >
          Crear usuario
        </button>
      </form>
    </main>
  );
}