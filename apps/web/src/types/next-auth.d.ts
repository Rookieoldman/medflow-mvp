import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id:        string;
      role:      string;
      firstName?: string | null;
      lastName1?: string | null;
      lastName2?: string | null;
      medhubOrganizationId?:   string | null;
      medhubOrganizationName?: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    id:        string;
    role:      string;
    firstName?: string | null;
    lastName1?: string | null;
    lastName2?: string | null;
    medhubOrganizationId?:   string | null;
    medhubOrganizationName?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?:        string;
    role?:      string;
    firstName?: string | null;
    lastName1?: string | null;
    lastName2?: string | null;
    medhubOrganizationId?:   string | null;
    medhubOrganizationName?: string | null;
  }
}
