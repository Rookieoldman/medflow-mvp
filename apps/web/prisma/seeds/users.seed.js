/* eslint-disable no-console */
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding users...");

  const passwordHash = await bcrypt.hash("1234", 10);

  // =========================
  // TECNICO
  // =========================
  await prisma.user.upsert({
    where: { email: "tecnico@medflow.dev" },
    update: {},
    create: {
      email: "tecnico@medflow.dev",
      password: passwordHash,
      role: "TECNICO",
      firstName: "Paco",
      lastName1: "Domínguez",
      lastName2: "Gutiérrez",
      employeeCode: "TEC001",
      shift: "MANANA",
      active: true,
      notes: "Usuario técnico de pruebas",
    },
  });

  // =========================
  // CELADOR
  // =========================
  await prisma.user.upsert({
    where: { email: "celador@medflow.dev" },
    update: {},
    create: {
      email: "celador@medflow.dev",
      password: passwordHash,
      role: "CELADOR",
      firstName: "Juan",
      lastName1: "Pérez",
      lastName2: "López",
      employeeCode: "CEL001",
      shift: "TARDE",
      active: true,
      notes: "Celador principal",
    },
  });

  // =========================
  // ADMIN
  // =========================
  await prisma.user.upsert({
    where: { email: "admin@medflow.dev" },
    update: {},
    create: {
      email: "admin@medflow.dev",
      password: passwordHash,
      role: "ADMIN",
      firstName: "Admin",
      lastName1: "MedFlow",
      employeeCode: "ADM001",
      active: true,
      notes: "Administrador del sistema",
    },
  });

  console.log("✅ Seed completado");
}

main()
  .catch((e) => {
    console.error("❌ Error en seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });