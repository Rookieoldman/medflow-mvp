/**
 * Prisma CLI / scripts: si el shell exporta `DATABASE_URL`, Next pot ignorar el `.env`
 * del paquet. Importar aquest mòdul abans de `PrismaClient` aplica `.env` i `.env.local`.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

export function loadRootEnvFiles(): void {
  for (const name of [".env", ".env.local"] as const) {
    const p = resolve(process.cwd(), name);
    if (!existsSync(p)) continue;
    const txt = readFileSync(p, "utf8");
    for (const rawLine of txt.split("\n")) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq <= 0) continue;
      const key = line.slice(0, eq).trim();
      let val = line.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  }
}

loadRootEnvFiles();
