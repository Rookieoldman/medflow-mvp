import UserActions from "./UserActions";
import { fDate } from "@/lib/format";

type User = {
  id:        string;
  email:     string;
  role:      string;
  firstName: string | null;
  lastName1: string | null;
  lastName2: string | null;
  active:    boolean;
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

export default function UserRow({ user }: { user: User }) {
  const fullName = [user.firstName, user.lastName1, user.lastName2]
    .filter(Boolean).join(" ");

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-4 py-3">
        <div className="font-medium text-gray-900 truncate max-w-[140px] sm:max-w-none">
          {fullName || <span className="text-gray-400 italic text-sm">Sin nombre</span>}
        </div>
        {/* email visible solo en móvil bajo el nombre */}
        <div className="text-xs text-gray-400 truncate max-w-[140px] sm:hidden mt-0.5">
          {user.email}
        </div>
      </td>

      <td className="px-4 py-3 text-gray-600 text-sm hidden sm:table-cell truncate max-w-[180px]">
        {user.email}
      </td>

      <td className="px-4 py-3">
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_BADGE[user.role] ?? "bg-gray-100 text-gray-700"}`}>
          {ROLE_LABEL[user.role] ?? user.role}
        </span>
      </td>

      <td className="px-4 py-3">
        {user.active ? (
          <span className="flex items-center gap-1.5 text-green-700 font-medium text-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
            <span className="hidden sm:inline">Activo</span>
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-gray-400 text-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-300 inline-block" />
            <span className="hidden sm:inline">Inactivo</span>
          </span>
        )}
      </td>

      <td className="px-4 py-3 text-gray-400 text-xs hidden md:table-cell whitespace-nowrap">
        {fDate(user.createdAt)}
      </td>

      <td className="px-4 py-3">
        <UserActions userId={user.id} active={user.active} />
      </td>
    </tr>
  );
}
