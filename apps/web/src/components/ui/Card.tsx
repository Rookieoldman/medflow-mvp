import { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: "sm" | "md" | "lg" | "none";
}

const PADDING = { none: "", sm: "p-4", md: "p-5", lg: "p-6" };

export function Card({ children, className = "", padding = "md" }: CardProps) {
  return (
    <div
      className={`border border-gray-200 rounded-xl bg-white shadow-sm ${PADDING[padding]} ${className}`}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export function CardHeader({ title, subtitle, action }: CardHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4 mb-4">
      <div>
        <h2 className="font-semibold text-gray-900">{title}</h2>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}
