"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin",           label: "Dashboard",     icon: "⬛", exact: true  },
  { href: "/admin/transfers", label: "Traslados",     icon: "🚑", exact: false },
  { href: "/admin/users",     label: "Usuarios",      icon: "👥", exact: false },
  { href: "/admin/stats",     label: "Estadísticas",  icon: "📊", exact: false },
];

export default function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-gray-200 overflow-x-auto scrollbar-hide -mx-4 sm:mx-0 px-4 sm:px-0">
      <div className="flex gap-0 min-w-max sm:min-w-0">
        {TABS.map(({ href, label, icon, exact }) => {
          const isActive = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`
                flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap
                border-b-2 -mb-px transition-colors
                ${isActive
                  ? "border-gray-900 text-gray-900"
                  : "border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300"}
              `}
            >
              <span className="sm:hidden text-base leading-none">{icon}</span>
              <span className="hidden sm:inline">{label}</span>
              <span className="sm:hidden text-xs">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
