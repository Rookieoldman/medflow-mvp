import "./globals.css";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";
import Toaster from "@/components/Toaster";
import PwaRegister from "@/components/PwaRegister";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title:       "MedFlow",
  description: "Gestión de traslados hospitalarios",
  manifest:    "/manifest.json",
  appleWebApp: {
    capable:       true,
    statusBarStyle: "black-translucent",
    title:          "MedFlow",
  },
};

export const viewport: Viewport = {
  themeColor:      "#111827",
  width:           "device-width",
  initialScale:    1,
  // Permite zoom por accesibilidad (vista cansada, texto pequeño en móvil)
  maximumScale:    5,
  userScalable:    true,
  viewportFit:     "cover",
};

const ROLE_LABEL: Record<string, string> = {
  ADMIN:   "Admin",
  TECNICO: "Técnico",
  CELADOR: "Celador",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  const user    = session?.user as any;

  return (
    <html lang="es">
      <body className="min-h-screen bg-gray-50">
        {session && (
          <header
            className="sticky top-0 z-30 border-b border-gray-200 bg-white shadow-sm
              pt-[max(0.75rem,env(safe-area-inset-top))]
              pb-3
              pl-[max(1rem,env(safe-area-inset-left))]
              pr-[max(1rem,env(safe-area-inset-right))]
              flex items-center justify-between gap-3 sm:gap-4"
          >
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <span className="text-base font-bold text-gray-900 tracking-tight shrink-0">
                MedFlow
              </span>
              <span className="hidden sm:inline text-gray-300 shrink-0">|</span>
              <span className="min-w-0 truncate text-sm text-gray-600 sm:text-gray-500">
                {user?.firstName
                  ? `${user.firstName} · ${ROLE_LABEL[user?.role] ?? user?.role}`
                  : user?.email}
              </span>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <Link
                href="/account"
                className="inline-flex items-center justify-center min-h-11 px-2 -mx-1 text-sm text-gray-600 hover:text-gray-900 underline underline-offset-2 rounded-lg active:bg-gray-100"
              >
                Mi cuenta
              </Link>
              <LogoutButton />
            </div>
          </header>
        )}

        <div className="min-h-[calc(100vh-57px)] pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {children}
        </div>
        {session && <Toaster />}
        {session && <PwaRegister />}
      </body>
    </html>
  );
}
