import UserActions from "./UserActions";

type User = {
  id: string;
  email: string;
  role: string;
  firstName: string | null;
  lastName1: string | null;
  lastName2: string | null;
  shift: string | null;
  active: boolean;
};

export default function UserRow({ user }: { user: User }) {
  const fullName = [user.firstName, user.lastName1, user.lastName2]
    .filter(Boolean)
    .join(" ");

  return (
    <tr className="border-t">
      <td className="p-3">{fullName || "-"}</td>
      <td className="p-3">{user.email}</td>
      <td className="p-3">{user.role}</td>
      <td className="p-3">{user.shift ?? "-"}</td>
      <td className="p-3">
        {user.active ? (
          <span className="text-green-600 font-medium">Activo</span>
        ) : (
          <span className="text-gray-400">Inactivo</span>
        )}
      </td>
      <td className="p-3 text-right">
        <UserActions userId={user.id} active={user.active} />
      </td>
    </tr>
  );
}