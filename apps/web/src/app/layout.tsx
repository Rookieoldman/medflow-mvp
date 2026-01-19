import "./globals.css";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import LogoutButton from "@/components/LogoutButton";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  return (
    <html lang="es">
      <body>
        {session && (
          <header className="border-b px-6 py-3 flex items-center justify-between">
            <div className="text-sm font-mono">
              Hola {session.user?.firstName} · {session.user?.role}
              
            </div>
            
            

            <LogoutButton />
          </header>
        )}

        <main>{children}</main>
      </body>
    </html>
  );
}