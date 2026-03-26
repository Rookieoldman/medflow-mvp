import "./globals.css";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
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
  themeColor:    "#111827",
  width:         "device-width",
  initialScale:  1,
  maximumScale:  1,
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
          <header className="sticky top-0 z-30 border-b border-gray-200 bg-white px-4 sm:px-6 py-3 flex items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3 min-w-0">
              {/* logo mark */}
              <span className="text-base font-bold text-gray-900 tracking-tight shrink-0">
                MedFlow
              </span>
              <span className="hidden sm:block text-gray-300">|</span>
              <span className="hidden sm:block text-sm text-gray-500 truncate">
                {user?.firstName
                  ? `${user.firstName} · ${ROLE_LABEL[user?.role] ?? user?.role}`
                  : user?.email}
              </span>
            </div>

            {/* mobile: rol badge */}
            <span className="sm:hidden text-xs font-medium text-gray-500 truncate max-w-[100px]">
              {ROLE_LABEL[user?.role] ?? user?.role}
            </span>

            <LogoutButton />
          </header>
        )}

        <div className="min-h-[calc(100vh-57px)]">{children}</div>
        {session && <Toaster />}
        {session && <PwaRegister />}
      </body>
    </html>
  );
}
