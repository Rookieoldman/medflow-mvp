"use client";

import { signOut } from "next-auth/react";
import { medhubPortalBaseUrl } from "@/lib/medhub-sso";

export default function LogoutButton() {
  const hubHome = medhubPortalBaseUrl();

  return (
    <button
      type="button"
      onClick={async () => {
        await signOut({ redirect: false });
        if (hubHome) {
          window.location.assign(`${hubHome}/`);
        } else {
          window.location.assign("/login");
        }
      }}
      className="inline-flex items-center justify-center min-h-11 px-2 -mx-1 text-sm underline hover:opacity-80 rounded-lg active:bg-gray-100"
    >
      Cerrar sesión
    </button>
  );
}
