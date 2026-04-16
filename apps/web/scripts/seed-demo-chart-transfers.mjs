/**
 * Crea traslados FINALIZADOS de demo (MRN prefijo DEMO-CHART-) repartidos al azar
 * entre mañana (08–14:59), tarde (15–21:59) y noche (resto), en los últimos días,
 * para visualizar las gráficas de admin → Estadísticas → Global.
 *
 * Uso (desde apps/web, con .env o .env.local y DATABASE_URL):
 *   npm run seed:demo-charts
 *
 * Requiere al menos un usuario TECNICO. Opcional: un CELADOR (se asigna en el traslado).
 */

import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { PrismaClient } from "@prisma/client";

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

try {
  require("dotenv").config({ path: join(root, ".env.local") });
  require("dotenv").config({ path: join(root, ".env") });
} catch {
  console.warn(
    "Aviso: instala dotenv (`npm i -D dotenv`) o exporta DATABASE_URL para cargar .env automáticamente."
  );
}

const prisma = new PrismaClient();

const TEST_TYPES = ["RM", "ECO", "RX", "TC", "MEDICINA_NUCLEAR"];
const DIFFS = ["BANAL", "MODERADO", "CRITICO"];

/** Hora local de finalización dentro del turno (misma lógica que getShift en app). */
function randomClosedAtForShift(dayStart, shiftKind) {
  const d = new Date(dayStart);
  let h;
  let min = Math.floor(Math.random() * 60);
  let sec = Math.floor(Math.random() * 60);

  if (shiftKind === "MANANA") {
    h = 8 + Math.floor(Math.random() * 7);
  } else if (shiftKind === "TARDE") {
    h = 15 + Math.floor(Math.random() * 7);
  } else {
    if (Math.random() < 0.55) {
      h = 22 + Math.floor(Math.random() * 2);
    } else {
      h = Math.floor(Math.random() * 8);
    }
  }

  d.setHours(h, min, sec, 0);
  return d;
}

function randomShiftKind() {
  const r = Math.random();
  if (r < 1 / 3) return "MANANA";
  if (r < 2 / 3) return "TARDE";
  return "NOCHE";
}

async function main() {
  let tecnico = await prisma.user.findFirst({
    where: { role: "TECNICO", active: true },
  });
  if (!tecnico) {
    tecnico = await prisma.user.findFirst({ where: { role: "TECNICO" } });
  }
  if (!tecnico) {
    console.error("No hay ningún usuario TECNICO. Crea uno desde Admin → Usuarios.");
    process.exit(1);
  }
  const tecnicoId = tecnico.id;

  const cel =
    (await prisma.user.findFirst({ where: { role: "CELADOR", active: true } })) ??
    (await prisma.user.findFirst({ where: { role: "CELADOR" } }));

  const deleted = await prisma.transfer.deleteMany({
    where: { mrn: { startsWith: "DEMO-CHART-" } },
  });
  if (deleted.count) console.log(`Eliminados ${deleted.count} traslados demo anteriores (DEMO-CHART-*).`);

  const DAYS = 32;
  const now = new Date();
  let n = 0;

  for (let offset = 0; offset < DAYS; offset++) {
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset, 0, 0, 0, 0);
    const perDay = 3 + Math.floor(Math.random() * 8);

    for (let i = 0; i < perDay; i++) {
      const shiftKind = randomShiftKind();
      const updatedAt = randomClosedAtForShift(dayStart, shiftKind);
      const leadMin = 20 + Math.floor(Math.random() * 180);
      const createdAt = new Date(updatedAt.getTime() - leadMin * 60 * 1000);

      const idPart = `${offset}-${i}-${Math.random().toString(36).slice(2, 9)}`;
      const mrn = `DEMO-CHART-${idPart}`;

      await prisma.transfer.create({
        data: {
          mrn,
          patientFullName: `Demo gráficas ${n + 1}`,
          dob:             new Date(1975, 3, 12),
          location:        ["UCI 4", "Hematología", "Box paros", "RMN planta baja"][n % 4],
          testType:        TEST_TYPES[Math.floor(Math.random() * TEST_TYPES.length)],
          priority:        Math.random() < 0.25 ? "URGENTE" : "NORMAL",
          status:          "FINALIZADO",
          scope:           "URGENCIAS",
          requiresAcceptance: false,
          difficulty:      DIFFS[Math.floor(Math.random() * DIFFS.length)],
          createdById:     tecnicoId,
          assignedToId:    cel?.id ?? null,
          createdAt,
          updatedAt,
        },
      });
      n += 1;
    }
  }

  console.log(`Creados ${n} traslados demo (MRN DEMO-CHART-*), finalizados repartidos entre turnos en los últimos ${DAYS} días.`);
  console.log("Abre Admin → Estadísticas → Global (período 30 días o 7 días) para ver las barras.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
