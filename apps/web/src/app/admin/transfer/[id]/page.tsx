import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminTransferDetail({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  // 🔑 Resolver params (Next 16 + Turbopack)
  const resolvedParams = await Promise.resolve(params as any);
  const id = resolvedParams?.id;

  if (!id) {
    return <main className="p-6">Falta el id en la URL.</main>;
  }

  const transfer = await prisma.transfer.findUnique({
    where: { id },
    include: {
      createdBy: true,
      assignedTo: true,
      acceptance: true,
      incidents: {
        include: { createdBy: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!transfer) {
    return <main className="p-6">Traslado no encontrado</main>;
  }


  return (
    <main className="p-6 space-y-8">
      <a href="/admin" className="underline text-sm">
        ← Volver a admin
      </a>

      {/* ===== DATOS DEL TRASLADO ===== */}
      <section className="space-y-2">
        <h1 className="text-xl font-semibold">Detalle del traslado</h1>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <strong>Nº historia:</strong> {transfer.mrn}
          </div>
          <div>
            <strong>Paciente:</strong> {transfer.patientFullName}
          </div>
          <div>
            <strong>Fecha nacimiento:</strong>{" "}
            {transfer.dob.toLocaleDateString()}
          </div>
          <div>
            <strong>Ubicación:</strong> {transfer.location}
          </div>
          <div>
            <strong>Tipo de prueba:</strong> {transfer.testType}
          </div>
          <div>
            <strong>Prioridad:</strong> {transfer.priority}
          </div>
          <div>
            <strong>Estado:</strong> {transfer.status}
          </div>
          <div>
            <strong>Creado:</strong>{" "}
            {transfer.createdAt.toLocaleString()}
          </div>
        </div>
      </section>

      {/* ===== RESPONSABLES ===== */}
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Responsables</h2>

        <div className="text-sm">
          <div>
            <strong>Técnico:</strong> {transfer.createdBy.email}
          </div>

          {transfer.assignedTo ? (
            <div>
              <strong>Celador:</strong> {transfer.assignedTo.email}
            </div>
          ) : (
            <div className="text-gray-500">Sin celador asignado</div>
          )}
        </div>
      </section>

      {/* ===== FIRMA / ACEPTACIÓN ===== */}
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Aceptación del traslado</h2>

        {!transfer.acceptance ? (
          <p className="text-sm text-gray-600">
            El traslado no ha sido aceptado todavía.
          </p>
        ) : (
          <div className="space-y-2 text-sm">
            <div>
              <strong>Firmante:</strong> {transfer.acceptance.signerName}
            </div>
            {transfer.acceptance.signerRole && (
              <div>
                <strong>Rol:</strong> {transfer.acceptance.signerRole}
              </div>
            )}
            <div>
              <strong>Fecha firma:</strong>{" "}
              {transfer.acceptance.signedAt.toLocaleString()}
            </div>

            {/* Firma */}
            <div>
              <strong>Firma:</strong>
              <div className="border mt-2 p-2 inline-block bg-white">
                <img
                  src={transfer.acceptance.signatureData}
                  alt="Firma"
                  className="max-h-32"
                />
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ===== INCIDENCIAS ===== */}
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Incidencias</h2>

        {transfer.incidents.length === 0 ? (
          <p className="text-sm text-gray-600">No hay incidencias.</p>
        ) : (
          <ul className="space-y-2">
            {transfer.incidents.map((i) => (
              <li key={i.id} className="border rounded p-3 text-sm">
                <div>
                  <strong>Tipo:</strong> {i.type}
                </div>
                {i.note && (
                  <div>
                    <strong>Nota:</strong> {i.note}
                  </div>
                )}
                <div className="text-xs text-gray-500">
                  {i.createdAt.toLocaleString()}
                  {i.createdBy && ` · ${i.createdBy.email}`}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}