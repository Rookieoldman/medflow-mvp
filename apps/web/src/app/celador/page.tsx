import CeladorClient from "./CeladorClient";

export const dynamic = "force-dynamic";

export default function CeladorPage() {
  return (
    <main className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">Celador · Mis traslados</h1>
      <CeladorClient />
    </main>
  );
}