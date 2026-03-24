"use client";

import Link from "next/link";
import { toggleUserActive } from "./serverActions";

type Props = {
  userId: string;
  active: boolean;
};

export default function UserActions({ userId, active }: Props) {
  return (
    <div className="flex items-center justify-end gap-2">
      <Link
        href={`/admin/users/${userId}`}
        className="px-3 py-1 text-xs font-medium rounded-md border border-gray-300 hover:bg-gray-50 transition-colors"
      >
        Editar
      </Link>

      <form action={toggleUserActive}>
        <input type="hidden" name="userId" value={userId} />
        <input type="hidden" name="active" value={active ? "false" : "true"} />
        <button
          type="submit"
          className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
            active
              ? "border border-red-200 text-red-600 hover:bg-red-50"
              : "border border-green-200 text-green-600 hover:bg-green-50"
          }`}
        >
          {active ? "Desactivar" : "Activar"}
        </button>
      </form>
    </div>
  );
}
