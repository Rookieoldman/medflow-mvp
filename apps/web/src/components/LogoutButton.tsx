"use client";

import { signOut } from "next-auth/react";

export default function LogoutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="text-sm underline hover:opacity-80"
    >
      Cerrar sesión
    </button>
  );
}
