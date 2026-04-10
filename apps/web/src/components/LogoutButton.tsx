"use client";

import { signOut } from "next-auth/react";

export default function LogoutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="inline-flex items-center justify-center min-h-11 px-2 -mx-1 text-sm underline hover:opacity-80 rounded-lg active:bg-gray-100"
    >
      Cerrar sesión
    </button>
  );
}
