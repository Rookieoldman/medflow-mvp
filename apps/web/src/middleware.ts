import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import {
  NEXTAUTH_COOKIE_APP_SLUG,
  nextAuthUsesSecureCookies,
  sessionTokenCookieName,
} from "@/lib/next-auth-app-cookies";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // SSO MEDHUB (JWT en query); ha de ser públic sense cookie NextAuth prèvia.
  if (pathname.startsWith("/auth/")) {
    return NextResponse.next();
  }

  const h = req.headers;
  if (
    h.has("next-action") ||
    h.has("rsc") ||
    h.has("next-router-state-tree")
  ) {
    return NextResponse.next();
  }

  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
    cookieName: sessionTokenCookieName(NEXTAUTH_COOKIE_APP_SLUG),
    secureCookie: nextAuthUsesSecureCookies(),
  });

  if (pathname.startsWith("/login")) {
    return NextResponse.next();
  }

  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const role = token.role as string;

  if (pathname.startsWith("/account")) {
    return NextResponse.next();
  }

  if (
    pathname === "/" ||
    pathname.startsWith("/tecnico") ||
    pathname.startsWith("/transfer")
  ) {
    if (role !== "TECNICO") {
      return NextResponse.redirect(
        new URL(role === "CELADOR" ? "/celador" : "/admin", req.url),
      );
    }
  }

  if (pathname.startsWith("/celador")) {
    if (role !== "CELADOR") {
      return NextResponse.redirect(
        new URL(role === "TECNICO" ? "/" : "/admin", req.url),
      );
    }
  }

  if (pathname.startsWith("/admin")) {
    if (role !== "ADMIN") {
      return NextResponse.redirect(
        new URL(role === "TECNICO" ? "/" : "/celador", req.url),
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/auth/:path*",
    "/",
    "/tecnico/:path*",
    "/transfer/:path*",
    "/celador/:path*",
    "/admin/:path*",
    "/account",
    "/account/:path*",
    "/login",
    "/login/forgot",
    "/login/reset",
  ],
};
