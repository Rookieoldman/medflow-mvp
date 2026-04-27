import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { updateUser } from "./actions";
import { fDate } from "@/lib/format";
import AdminResetPasswordForm from "./AdminResetPasswordForm";
import ShiftSelector from "../ShiftSelector";

export const dynamic = "force-dynamic";

const ROLE_CONFIG: Record<string, { label: string; badge: string; avatar: string }> = {
  ADMIN:   { label: "Admin",    badge: "bg-purple-100 text-purple-800", avatar: "bg-purple-600" },
  TECNICO: { label: "Técnico",  badge: "bg-blue-100 text-blue-800",     avatar: "bg-blue-600"   },
  CELADOR: { label: "Celador",  badge: "bg-green-100 text-green-800",   avatar: "bg-green-600"  },
};

function getInitials(firstName: string | null, lastName: string | null) {
  const parts = [firstName, lastName].filter(Boolean);
  if (parts.length === 0) return "?";
  return parts.map((p) => p![0].toUpperCase()).join("");
}


export default async function EditUserPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const resolvedParams = await Promise.resolve(params as any);
  const id = resolvedParams?.id;

  if (!id) return <p className="p-6 text-sm text-gray-500">Falta id de usuario.</p>;

  const [userRecord, shiftLogs] = await Promise.all([
    prisma.user.findUnique({ where: { id } }),
    prisma.shiftChangeLog.findMany({
      where:   { userId: id },
      orderBy: { changedAt: "desc" },
      take:    30,
    }),
  ]);

  if (!userRecord) return <p className="p-6 text-sm text-gray-500">Usuario no encontrado.</p>;
  const user = userRecord;

  const roleConfig = ROLE_CONFIG[user.role] ?? {
    label: user.role,
    badge: "bg-gray-100 text-gray-700",
    avatar: "bg-gray-500",
  };

  const fullName = [user.firstName, user.lastName1, user.lastName2]
    .filter(Boolean)
    .join(" ");

  const initials = getInitials(user.firstName, user.lastName1);

  return (
    <div className="space-y-5 max-w-4xl">

      <Link
        href="/admin/users"
        className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-700 transition-colors"
      >
        ← Volver a usuarios
      </Link>

      <div className="flex flex-col sm:flex-row gap-5 sm:gap-6 items-start">

        {/* ── COLUMNA IZQUIERDA: perfil ── */}
        <aside className="w-full sm:w-56 shrink-0 space-y-4">
          {/* Tarjeta de identidad */}
          <div className="border rounded-xl p-5 bg-white shadow-sm space-y-4">
            {/* Avatar + nombre */}
            <div className="flex flex-col items-center text-center gap-3">
              <div
                className={`w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold ${roleConfig.avatar}`}
              >
                {initials}
              </div>
              <div>
                <p className="font-semibold text-gray-900 leading-snug">
                  {fullName || <span className="italic text-gray-400">Sin nombre</span>}
                </p>
                <span className={`mt-1 inline-block px-2 py-0.5 rounded-full text-xs font-medium ${roleConfig.badge}`}>
                  {roleConfig.label}
                </span>
              </div>
            </div>

            <hr />

            {/* Metadatos */}
            <dl className="space-y-2 text-xs">
              <div>
                <dt className="text-gray-400">Email</dt>
                <dd className="text-gray-700 truncate font-medium">{user.email}</dd>
              </div>
              <div>
                <dt className="text-gray-400">Alta</dt>
                <dd className="text-gray-700">{fDate(user.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-gray-400">ID</dt>
                <dd className="text-gray-400 font-mono">{user.id.slice(0, 12)}…</dd>
              </div>
            </dl>

            <hr />

            {/* Estado */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Estado</span>
              {user.active ? (
                <span className="flex items-center gap-1.5 text-green-700 text-xs font-medium">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  Activo
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-gray-400 text-xs">
                  <span className="w-2 h-2 rounded-full bg-gray-300" />
                  Inactivo
                </span>
              )}
            </div>

            {(user.role === "CELADOR" || user.role === "TECNICO") && (
              <>
                <hr />
                <div className="space-y-1.5">
                  <span className="text-xs text-gray-500">Turno activo</span>
                  <ShiftSelector userId={user.id} currentShift={user.activeShift ?? null} />
                </div>
              </>
            )}
          </div>
        </aside>

        {/* ── COLUMNA DERECHA: formulario + historial ── */}
        <div className="flex-1 min-w-0 space-y-5">
          <form action={updateUser} className="border rounded-xl bg-white shadow-sm overflow-hidden">
            <input type="hidden" name="id" value={user.id} />

            <div className="px-6 py-4 border-b">
              <h1 className="font-semibold text-gray-900">Editar usuario</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Los cambios se aplican inmediatamente al guardar.
              </p>
            </div>

            <div className="p-6 space-y-6">

              {/* Nombre completo */}
              <section className="space-y-3">
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Nombre completo
                </h2>
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
              </section>

              <hr />

              {/* Email */}
              <section className="space-y-3">
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Acceso
                </h2>
                <div className="space-y-1">
                  <label className="text-xs text-gray-500">Email (no editable)</label>
                  <input
                    value={user.email}
                    disabled
                    className="border rounded-lg px-3 py-2 w-full text-sm bg-gray-50 text-gray-400 cursor-not-allowed"
                  />
                </div>
                <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                  Si el usuario no recuerda su contraseña, usa el bloque siguiente para asignar una nueva.
                  Comunícala por un canal seguro (nunca por email sin cifrar).
                </p>
              </section>

              <hr />

              <section className="space-y-3">
                <h2 className="text-xs font-semibold text-amber-800 uppercase tracking-wide">
                  Restablecer contraseña
                </h2>
                <AdminResetPasswordForm userId={user.id} />
              </section>

              <hr />

              {/* Rol y estado */}
              <section className="space-y-3">
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Rol y estado
                </h2>
                <div className="grid grid-cols-2 gap-4">
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

                  <div className="space-y-1">
                    <span className="text-xs text-gray-500">Estado</span>
                    <label className="flex items-center gap-3 border rounded-lg px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors">
                      <input
                        type="checkbox"
                        name="active"
                        defaultChecked={user.active}
                        className="w-4 h-4 rounded border-gray-300 accent-black"
                      />
                      <span className="text-sm text-gray-700">Usuario activo</span>
                    </label>
                  </div>
                </div>
              </section>
            </div>

            {/* Footer del formulario */}
            <div className="px-6 py-4 border-t bg-gray-50 flex items-center gap-3">
              <button
                type="submit"
                className="rounded-lg bg-gray-900 text-white px-5 py-2 text-sm font-medium hover:bg-gray-700 transition-colors"
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

          {/* ── HISTORIAL DE TURNOS ── */}
          {shiftLogs.length > 0 && (
            <div className="border rounded-xl bg-white shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b">
                <h2 className="font-semibold text-gray-900">Historial de cambios de turno</h2>
                <p className="text-sm text-gray-500 mt-0.5">Últimos {shiftLogs.length} registros</p>
              </div>
              <div className="divide-y divide-gray-50 max-h-72 overflow-y-auto">
                {shiftLogs.map((log) => {
                  const SHIFT_LABEL: Record<string, string> = {
                    MANANA: "☀️ Mañana",
                    TARDE:  "🌆 Tarde",
                    NOCHE:  "🌙 Noche",
                  };
                  const from = log.fromShift ? (SHIFT_LABEL[log.fromShift] ?? log.fromShift) : "Fuera de turno";
                  const to   = log.toShift   ? (SHIFT_LABEL[log.toShift]   ?? log.toShift)   : "Fuera de turno";
                  const isAdmin = log.changedByRole === "ADMIN";
                  return (
                    <div key={log.id} className="flex items-start justify-between px-6 py-3 gap-4 text-sm">
                      <div className="min-w-0">
                        <p className="text-gray-800">
                          <span className="text-gray-400">{from}</span>
                          {" → "}
                          <span className="font-medium">{to}</span>
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {isAdmin ? "👤 Admin · " : "🙋 Autoservicio · "}
                          {log.changedByName}
                        </p>
                      </div>
                      <time className="text-xs text-gray-400 shrink-0 tabular-nums">
                        {new Date(log.changedAt).toLocaleString("es-ES", {
                          day: "2-digit", month: "2-digit", year: "2-digit",
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </time>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {shiftLogs.length === 0 && (user.role === "CELADOR" || user.role === "TECNICO") && (
            <div className="border rounded-xl bg-white shadow-sm px-6 py-5">
              <h2 className="font-semibold text-gray-900 mb-1">Historial de cambios de turno</h2>
              <p className="text-sm text-gray-400 italic">Sin cambios registrados todavía.</p>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
