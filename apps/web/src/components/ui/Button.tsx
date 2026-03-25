"use client";

import { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost";
type Size    = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:  Variant;
  size?:     Size;
  loading?:  boolean;
  children:  ReactNode;
}

const VARIANTS: Record<Variant, string> = {
  primary:   "bg-gray-900 text-white hover:bg-gray-700 border-transparent",
  secondary: "bg-white text-gray-700 border-gray-200 hover:bg-gray-50",
  danger:    "bg-red-600 text-white hover:bg-red-700 border-transparent",
  ghost:     "bg-transparent text-gray-600 border-transparent hover:bg-gray-100",
};

const SIZES: Record<Size, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
  lg: "px-5 py-2.5 text-sm",
};

export function Button({
  variant = "primary",
  size    = "md",
  loading = false,
  children,
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center gap-2 font-medium rounded-lg border
        transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300
        disabled:opacity-50 disabled:cursor-not-allowed
        ${VARIANTS[variant]} ${SIZES[size]} ${className}
      `.trim()}
    >
      {loading && (
        <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {children}
    </button>
  );
}
