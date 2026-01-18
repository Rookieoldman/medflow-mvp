import { prisma } from "@/lib/prisma";
import { getOrCreateDevCelador } from "@/lib/devUser";
import CeladorClient from "./CeladorClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CeladorPage() {
  const celador = await getOrCreateDevCelador();

  const available = await prisma.transfer.findMany({
    where: { status: "SOLICITADO", assignedToId: null },
    orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
  });

  const mine = await prisma.transfer.findMany({
    where: { assignedToId: celador.id, status: { notIn: ["FINALIZADO"] } },
    orderBy: [{ priority: "desc" }, { updatedAt: "desc" }],
  });

  return (
    <main className="p-6 space-y-10">
      <header>
        <h1 className="text-xl font-semibold">Celador</h1>
      </header>

      <CeladorClient available={available} mine={mine} />
    </main>
  );
}