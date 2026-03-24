import UserActions from "./UserActions";

type User = {
  id: string;
  email: string;
  role: string;
  firstName: string | null;
  lastName1: string | null;
  lastName2: string | null;
  active: boolean;
  createdAt: Date;
};

const ROLE_BADGE: Record<string, string> = {
  ADMIN:   "bg-purple-100 text-purple-800",
  TECNICO: "bg-blue-100 text-blue-800",
  CELADOR: "bg-green-100 text-green-800",
};

const ROLE_LABEL: Record<string, string> = {
  ADMIN:   "Admin",
  TECNICO: "Técnico",
  CELADOR: "Celador",
};

function formatDate(date: Date) {
  return date.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function UserRow({ user }: { user: User }) {
  const fullName = [user.firstName, user.lastName1, user.lastName2]
    .filter(Boolean)
    .join(" ");

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-4 py-3 font-medium text-gray-900">
        {fullName || <span className="text-gray-400 italic">Sin nombre</span>}
      </td>

      <td className="px-4 py-3 text-gray-600">{user.email}</td>

      <td className="px-4 py-3">
        <span
          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
            ROLE_BADGE[user.role] ?? "bg-gray-100 text-gray-700"
          }`}
        >
          {ROLE_LABEL[user.role] ?? user.role}
        </span>
      </td>

      <td className="px-4 py-3">
        {user.active ? (
          <span className="flex items-center gap-1.5 text-green-700 font-medium text-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
            Activo
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-gray-400 text-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-300 inline-block" />
            Inactivo
          </span>
        )}
      </td>

      <td className="px-4 py-3 text-gray-400 text-xs">
        {formatDate(user.createdAt)}
      </td>

      <td className="px-4 py-3">
        <UserActions userId={user.id} active={user.active} />
      </td>
    </tr>
  );
}
