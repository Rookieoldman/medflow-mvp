"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin",                     label: "Dashboard",    exact: true  },
  { href: "/admin/transfers",           label: "Traslados",    exact: false },
  { href: "/admin/users",               label: "Usuarios",     exact: false },
  { href: "/admin/stats/globalStats",   label: "Estadísticas", exact: false },
];

export default function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 border-b">
      {TABS.map(({ href, label, exact }) => {
        const isActive = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`px-4 py-2 text-sm transition-colors border-b-2 -mb-px ${
              isActive
                ? "border-black font-medium text-black"
                : "border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
