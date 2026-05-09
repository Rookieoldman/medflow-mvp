import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import {
  mapMedhubRoleToMedflow,
  verifyMedhubSsoToken,
} from "@/lib/medhub-sso";
import {
  NEXTAUTH_COOKIE_APP_SLUG,
  nextAuthAppCookies,
} from "@/lib/next-auth-app-cookies";

const allowPasswordLogin =
  process.env.ALLOW_MEDFLOW_PASSWORD_LOGIN === "true";

function flattenCredentialsProvider(
  raw: ReturnType<typeof CredentialsProvider>,
) {
  const { options, ...rest } = raw as typeof raw & {
    options?: Record<string, unknown>;
  };
  return { ...rest, ...(options ?? {}) } as NextAuthOptions["providers"][number];
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  debug: false,
  cookies: nextAuthAppCookies(NEXTAUTH_COOKIE_APP_SLUG),

  session: {
    strategy: "jwt",
  },

  providers: [
    ...(allowPasswordLogin
      ? [
          flattenCredentialsProvider(
            CredentialsProvider({
              id: "credentials",
              name: "Credenciales",
              credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
              },

              async authorize(credentials) {
                if (!credentials?.email || !credentials.password) return null;

                const email = String(credentials.email ?? "").trim();
                const user = await prisma.user.findFirst({
                  where: { email: { equals: email, mode: "insensitive" } },
                });

                if (!user) return null;
                if (!user.active) return null;

                const valid = await bcrypt.compare(
                  credentials.password,
                  user.password,
                );

                if (!valid) return null;

                return {
                  id: user.id,
                  email: user.email,
                  role: user.role,
                  firstName: user.firstName,
                  lastName1: user.lastName1,
                  lastName2: user.lastName2,
                };
              },
            }),
          ),
        ]
      : []),
    flattenCredentialsProvider(
      CredentialsProvider({
        id: "medhub-sso",
        name: "MEDHUB SSO",
        credentials: {
          medhubToken: { label: "Token", type: "text" },
        },
        async authorize(credentials) {
          try {
            const raw =
              typeof credentials?.medhubToken === "string"
                ? credentials.medhubToken.trim()
                : "";
            if (!raw) return null;

            const payload = await verifyMedhubSsoToken(raw);
            if (!payload) return null;

            const role = mapMedhubRoleToMedflow(payload.role);
            const localPart =
              payload.email.split("@")[0]?.trim() || "Usuario MEDHUB";

            const user = await prisma.user.upsert({
              where: { email: payload.email },
              create: {
                email: payload.email,
                password: await bcrypt.hash(crypto.randomUUID(), 12),
                role,
                firstName: localPart,
                lastName1: null,
                lastName2: null,
                active: true,
              },
              update: {
                role,
                active: true,
              },
            });

            if (!user.active) return null;

            return {
              id: user.id,
              email: user.email,
              role: user.role,
              firstName: user.firstName,
              lastName1: user.lastName1,
              lastName2: user.lastName2,
              medhubOrganizationId: payload.organizationId,
              medhubOrganizationName: payload.organizationName,
            };
          } catch (e) {
            const detail =
              e instanceof Prisma.PrismaClientKnownRequestError
                ? `${e.code} ${e.message}`
                : e instanceof Error
                  ? e.message
                  : String(e);
            console.error("[next-auth][medhub-sso] authorize:", detail, e);
            return null;
          }
        },
      }),
    ),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as { id: string }).id;
        token.role = (user as { role: string }).role;
        token.firstName = (user as { firstName?: string | null }).firstName;
        token.lastName1 = (user as { lastName1?: string | null }).lastName1;
        token.lastName2 = (user as { lastName2?: string | null }).lastName2;

        const ext = user as {
          medhubOrganizationId?: string;
          medhubOrganizationName?: string;
        };
        if (ext.medhubOrganizationId) {
          token.medhubOrganizationId = ext.medhubOrganizationId;
          token.medhubOrganizationName = ext.medhubOrganizationName ?? "";
        }
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.firstName = token.firstName as string;
        session.user.lastName1 = token.lastName1 as string;
        session.user.lastName2 = token.lastName2 as string;

        session.user.medhubOrganizationId =
          (token.medhubOrganizationId as string | null | undefined) ?? null;
        session.user.medhubOrganizationName =
          (token.medhubOrganizationName as string | null | undefined) ?? null;

        session.user.name = [
          token.firstName,
          token.lastName1,
          token.lastName2,
        ]
          .filter(Boolean)
          .join(" ");
      }

      return session;
    },
  },
};
