import { prisma } from "./prisma";
import bcrypt from "bcryptjs";

async function getOrCreateDevUser(email: string, role: "TECNICO" | "CELADOR" | "ADMIN") {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return existing;

  const passwordHash = await bcrypt.hash("1234", 10);

  return prisma.user.create({
    data: {
      email,
      role,
      password: passwordHash,
      active: true,
    },
  });
}

export function getOrCreateDevTecnico() {
  return getOrCreateDevUser("tecnico@medflow.dev", "TECNICO");
}

export function getOrCreateDevCelador() {
  return getOrCreateDevUser("celador@medflow.dev", "CELADOR");
}

export function getOrCreateDevAdmin() {
  return getOrCreateDevUser("admin@medflow.dev", "ADMIN");
}