import { prisma } from "@/lib/prisma";

export async function getOrCreateDevTecnico() {
  const email = "tecnico@medflow.dev";
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return existing;

  return prisma.user.create({
    data: { email, role: "TECNICO" },
  });
}
export async function getOrCreateDevCelador() {
  const email = "celador@medflow.dev";
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return existing;

  return prisma.user.create({ data: { email, role: "CELADOR" } });
}