import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash("1234", 10);

  const users = [
    { email: "tecnico@medflow.dev", role: "TECNICO" },
    { email: "celador@medflow.dev", role: "CELADOR" },
    { email: "admin@medflow.dev", role: "ADMIN" },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: { password },
      create: { ...user, password },
    });
  }

  console.log("✅ Usuarios regenerados correctamente");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());