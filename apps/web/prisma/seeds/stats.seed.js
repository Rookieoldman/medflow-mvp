/* eslint-disable no-console */
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

async function main() {
  console.log("🧹 Limpiando base de datos...");
  await prisma.incident.deleteMany();
  await prisma.transferAcceptance.deleteMany();
  await prisma.transfer.deleteMany();
  await prisma.user.deleteMany();

  console.log("👥 Creando usuarios...");

  const password = await bcrypt.hash("1234", 10);

  const admin = await prisma.user.create({
    data: {
      email: "admin@medflow.dev",
      password,
      role: "ADMIN",
      firstName: "Admin",
      lastName1: "Medflow",
      active: true,
    },
  });

  const tecnico = await prisma.user.create({
    data: {
      email: "tecnico@medflow.dev",
      password,
      role: "TECNICO",
      firstName: "Oriol",
      lastName1: "Técnico",
      active: true,
    },
  });

  const celadores = await Promise.all(
    ["Juan", "Laura", "Marc"].map((name, i) =>
      prisma.user.create({
        data: {
          email: `celador${i + 1}@medflow.dev`,
          password,
          role: "CELADOR",
          firstName: name,
          lastName1: "Celador",
          active: true,
        },
      })
    )
  );

  console.log("🚑 Creando traslados con fechas variadas...");

  const STATUSES = [
    "FINALIZADO",
    "FINALIZADO",
    "FINALIZADO",
    "CANCELADO",
  ];

  for (let i = 0; i < 30; i++) {
    const status = STATUSES[i % STATUSES.length];
    const createdAt = daysAgo(Math.floor(Math.random() * 14));

    const transfer = await prisma.transfer.create({
      data: {
        mrn: `MRN-${1000 + i}`,
        patientFullName: `Paciente ${i + 1}`,
        dob: new Date(1970 + (i % 30), 1, 1),
        location: i % 2 === 0 ? "Planta 2" : "Urgencias",
        testType: "RX",
        priority: i % 4 === 0 ? "URGENTE" : "NORMAL",
        status,
        createdAt,
        updatedAt: createdAt,
        createdById: tecnico.id,
        assignedToId:
          status !== "CANCELADO"
            ? celadores[i % celadores.length].id
            : null,
      },
    });

    if (status === "FINALIZADO") {
      await prisma.transferAcceptance.create({
        data: {
          transferId: transfer.id,
          signerName: "Responsable Planta",
          signatureData: "data:image/png;base64,FAKE",
          celadorId: celadores[i % celadores.length].id,
          signedAt: createdAt,
        },
      });
    }
  }

  console.log("✅ Seed de estadísticas completado");
}

main()
  .catch((e) => {
    console.error("❌ Error en seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });