import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
  const token = await getToken({ req });
  const { pathname } = req.nextUrl;

  // Rutas públicas
  if (pathname.startsWith("/login")) {
    return NextResponse.next();
  }

  // Sin sesión → login
  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const role = token.role as string;

  // 🔒 PROTECCIÓN POR ROL

  // Técnico
  if (pathname === "/" || pathname.startsWith("/transfer")) {
    if (role !== "TECNICO") {
      return NextResponse.redirect(
        new URL(role === "CELADOR" ? "/celador" : "/admin", req.url)
      );
    }
  }

  // Celador
  if (pathname.startsWith("/celador")) {
    if (role !== "CELADOR") {
      return NextResponse.redirect(
        new URL(role === "TECNICO" ? "/" : "/admin", req.url)
      );
    }
  }

  // Admin
  if (pathname.startsWith("/admin")) {
    if (role !== "ADMIN") {
      return NextResponse.redirect(
        new URL(role === "TECNICO" ? "/" : "/celador", req.url)
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/transfer/:path*",
    "/celador/:path*",
    "/admin/:path*",
    "/login",
  ],
};