import { prisma } from "@/lib/prisma";
import { markEnLaPrueba } from "./serverActions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function TransferDetail({
  params,
}: {
  // Next 16 + Turbopack: params puede llegar como Promise
  params: Promise<{ id: string }> | { id: string };
}) {
  const resolvedParams = await Promise.resolve(params as any);
  const id = resolvedParams?.id;

  if (!id) {
    return <main className="p-6">Falta el id en la URL.</main>;
  }

  const transfer = await prisma.transfer.findUnique({
    where: { id },
    include: { incidents: { orderBy: { createdAt: "desc" } } },
  });

  if (!transfer) return <main className="p-6">No encontrado</main>;

  const canMarkEnLaPrueba =
    transfer.status === "EN_CAMINO_PRUEBA" || transfer.status === "EN_ESPERA";

  return (
    <main className="p-6 space-y-6">
      <a href="/" className="underline text-sm">
        ← Volver
      </a>

      <header className="space-y-1">
        <h1 className="text-xl font-semibold">
          {transfer.origin} → {transfer.destination}
        </h1>
        <div className="text-sm text-gray-600">
          Estado: <span className="font-mono">{transfer.status}</span>
        </div>
        <div className="text-xs text-gray-500 font-mono">{transfer.id}</div>
      </header>

      {canMarkEnLaPrueba && (
        <form action={markEnLaPrueba}>
          <input type="hidden" name="transferId" value={transfer.id} />
          <button className="bg-green-600 text-white px-4 py-2" type="submit">
            Marcar “En la prueba”
          </button>
        </form>
      )}

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Incidencias</h2>
        {transfer.incidents.length === 0 ? (
          <p className="text-sm text-gray-600">No hay incidencias.</p>
        ) : (
          <ul className="space-y-2">
            {transfer.incidents.map((i) => (
              <li key={i.id} className="border rounded p-3">
                <div className="font-mono text-sm">{i.type}</div>
                {i.note && <div className="text-sm">{i.note}</div>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}