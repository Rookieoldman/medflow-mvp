"use client";

import { useState } from "react";
import Link from "next/link";

type Props = {
  userId: string;
  active: boolean;
};

export default function UserActions({ userId, active }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      {/* Botón ⋮ */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="px-2 py-1 rounded hover:bg-gray-100"
      >
        ⋮
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-40 rounded-md border bg-white shadow z-10">
          <ul className="text-sm">
            {/* Editar */}
            <li>
              <Link
                href={`/admin/users/${userId}`}
                className="block px-4 py-2 hover:bg-gray-100"
                onClick={() => setOpen(false)}
              >
                Editar
              </Link>
            </li>

            {/* Activar / Desactivar */}
            <li>
              <form action={toggleUserActive}>
                <input type="hidden" name="userId" value={userId} />
                <input
                  type="hidden"
                  name="active"
                  value={active ? "false" : "true"}
                />
                <button
                  type="submit"
                  className="w-full text-left px-4 py-2 hover:bg-gray-100"
                >
                  {active ? "Desactivar" : "Activar"}
                </button>
              </form>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}