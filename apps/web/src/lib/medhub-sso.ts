import { jwtVerify } from "jose";
import type { Role } from "@prisma/client";

const alg = "HS256";
const EXPECTED_APP_ID = "MEDFLOW";

function getSecret(): Uint8Array {
  const s = process.env.MEDHUB_JWT_SECRET?.trim();
  if (!s) throw new Error("MEDHUB_JWT_SECRET no configurado");
  return new TextEncoder().encode(s);
}

export type MedhubSsoPayload = {
  sub: string;
  email: string;
  role: string;
  organizationId: string;
  appId: string;
};

/** Valida el JWT emitido por MEDHUB Platform para abrir MEDFLOW. */
export async function verifyMedhubSsoToken(
  token: string,
): Promise<MedhubSsoPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      algorithms: [alg],
      clockTolerance: "60s",
    });
    const sub = payload.sub;
    const email = payload.email as string | undefined;
    const role = payload.role as string | undefined;
    const organizationId = payload.organizationId as string | undefined;
    const appId = payload.appId as string | undefined;
    if (!sub || !email || !role || !organizationId || !appId) return null;
    if (appId !== EXPECTED_APP_ID) return null;
    if (role === "SUPERUSER") return null;
    return {
      sub,
      email: email.toLowerCase(),
      role,
      organizationId,
      appId,
    };
  } catch {
    return null;
  }
}

/**
 * Mapa roles MEDHUB → MEDFLOW.
 * Roles hospitalarios sin celador/técnico radiología se tratan como flujo operativo (TECNICO).
 */
export function mapMedhubRoleToMedflow(hubRole: string): Role {
  switch (hubRole) {
    case "ORG_ADMIN":
      return "ADMIN";
    case "CELADOR":
      return "CELADOR";
    case "TECNICO_RAD":
      return "TECNICO";
    case "MEDICO":
    case "ADMINISTRATIVO":
    case "INFERMER":
      return "TECNICO";
    default:
      return "TECNICO";
  }
}

/**
 * URL base del portal MEDHUB (sin barra final).
 * En desarrollo, si falta `NEXT_PUBLIC_MEDHUB_URL`, usa el puerto por defecto del platform (3000).
 */
export function medhubPortalBaseUrl(): string | null {
  const raw = process.env.NEXT_PUBLIC_MEDHUB_URL?.trim();
  if (raw) return raw.replace(/\/$/, "");
  if (process.env.NODE_ENV === "development") return "http://localhost:3000";
  return null;
}

export function medhubAppsUrl(): string | null {
  const base = medhubPortalBaseUrl();
  if (!base) return null;
  return `${base}/apps`;
}
