import type { NextAuthOptions } from "next-auth";

export const NEXTAUTH_COOKIE_APP_SLUG = "medflow";

export function nextAuthUsesSecureCookies(): boolean {
  return (
    process.env.NEXTAUTH_URL?.startsWith("https://") === true ||
    Boolean(process.env.VERCEL)
  );
}

export function sessionTokenCookieName(appSlug: string): string {
  const secureCookie = nextAuthUsesSecureCookies();
  const cookiePrefix = secureCookie ? "__Secure-" : "";
  return `${cookiePrefix}next-auth.session-token.${appSlug}`;
}

export function nextAuthAppCookies(
  appSlug: string,
): NonNullable<NextAuthOptions["cookies"]> {
  const secureCookie = nextAuthUsesSecureCookies();
  const cookiePrefix = secureCookie ? "__Secure-" : "";
  const hostPrefix = secureCookie ? "__Host-" : "";
  const suf = `.${appSlug}`;
  const common = {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure: secureCookie,
  };
  return {
    sessionToken: {
      name: `${cookiePrefix}next-auth.session-token${suf}`,
      options: { ...common },
    },
    callbackUrl: {
      name: `${cookiePrefix}next-auth.callback-url${suf}`,
      options: { ...common },
    },
    csrfToken: {
      name: `${hostPrefix}next-auth.csrf-token${suf}`,
      options: { ...common },
    },
    pkceCodeVerifier: {
      name: `${cookiePrefix}next-auth.pkce.code_verifier${suf}`,
      options: { ...common, maxAge: 60 * 15 },
    },
    state: {
      name: `${cookiePrefix}next-auth.state${suf}`,
      options: { ...common, maxAge: 60 * 15 },
    },
    nonce: {
      name: `${cookiePrefix}next-auth.nonce${suf}`,
      options: { ...common },
    },
  };
}
