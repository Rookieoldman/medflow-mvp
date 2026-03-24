import Link from "next/link";
import { createUser } from "./actions";

export const dynamic = "force-dynamic";

export default function NewUserPage() {
  return (
    <div className="max-w-xl space-y-6">
      <Link href="/admin/users" className="text-sm text-gray-500 hover:text-gray-800 transition-colors">
        ← Volver a usuarios
      </Link>

      <div>
        <h1 className="text-xl font-semibold">Crear usuario</h1>
        <p className="text-sm text-gray-500 mt-1">Rellena los datos del nuevo usuario.</p>
      </div>

      <form action={createUser} className="space-y-5 border rounded-xl p-6 shadow-sm bg-white">

        {/* Nombre */}
        <fieldset className="space-y-3">
          <legend className="text-sm font-medium text-gray-700">Nombre completo</legend>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label htmlFor="firstName" className="text-xs text-gray-500">Nombre</label>
              <input
                id="firstName"
                name="firstName"
                placeholder="Ej. Juan"
                className="border rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="lastName1" className="text-xs text-gray-500">Primer apellido</label>
              <input
                id="lastName1"
                name="lastName1"
                placeholder="Ej. García"
                className="border rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
              />
            </div>
            <div className="space-y-1 col-span-2">
              <label htmlFor="lastName2" className="text-xs text-gray-500">Segundo apellido</label>
              <input
                id="lastName2"
                name="lastName2"
                placeholder="Ej. López"
                className="border rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
              />
            </div>
          </div>
        </fieldset>

        {/* Credenciales */}
        <fieldset className="space-y-3">
          <legend className="text-sm font-medium text-gray-700">Credenciales de acceso</legend>
          <div className="space-y-1">
            <label htmlFor="email" className="text-xs text-gray-500">Email <span className="text-red-500">*</span></label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="usuario@medflow.dev"
              className="border rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
              required
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="password" className="text-xs text-gray-500">Contraseña <span className="text-red-500">*</span></label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="Mínimo 8 caracteres"
              className="border rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
              required
            />
          </div>
        </fieldset>

        {/* Rol y estado */}
        <fieldset className="space-y-3">
          <legend className="text-sm font-medium text-gray-700">Rol y estado</legend>
          <div className="space-y-1">
            <label htmlFor="role" className="text-xs text-gray-500">Rol <span className="text-red-500">*</span></label>
            <select
              id="role"
              name="role"
              className="border rounded-lg px-3 py-2 w-full text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-300"
              required
            >
              <option value="">Selecciona un rol</option>
              <option value="TECNICO">Técnico</option>
              <option value="CELADOR">Celador</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>

          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              name="active"
              defaultChecked
              className="w-4 h-4 rounded border-gray-300"
            />
            <span className="text-sm text-gray-700">Usuario activo al crear</span>
          </label>
        </fieldset>

        <div className="pt-2 flex items-center gap-3">
          <button
            type="submit"
            className="rounded-lg bg-black text-white px-5 py-2 text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            Crear usuario
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
