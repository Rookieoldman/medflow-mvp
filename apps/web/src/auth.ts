import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  debug:false,

  session: {
    strategy: "jwt",
  },

  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },

      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user) return null;

        const valid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!valid) return null;

        // 🔑 DEVOLVEMOS EL USUARIO COMPLETO QUE QUEREMOS EN EL TOKEN
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
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id;
        token.role = (user as any).role;
        token.firstName = (user as any).firstName;
        token.lastName1 = (user as any).lastName1;
        token.lastName2 = (user as any).lastName2;
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

        // 🧠 Nombre bonito para la UI
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

export default NextAuth(authOptions);