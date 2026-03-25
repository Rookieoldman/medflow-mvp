import { ReactNode } from "react";
import Link from "next/link";

interface PageHeaderProps {
  title:    string;
  subtitle?: string;
  back?:    { href: string; label?: string };
  action?:  ReactNode;
}

export function PageHeader({ title, subtitle, back, action }: PageHeaderProps) {
  return (
    <div className="space-y-1 mb-6">
      {back && (
        <Link
          href={back.href}
          className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-700 transition-colors mb-1"
        >
          ← {back.label ?? "Volver"}
        </Link>
      )}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
          {subtitle && (
            <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>
          )}
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>
    </div>
  );
}
