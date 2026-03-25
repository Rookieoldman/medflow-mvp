import CeladorClient from "./CeladorClient";

export const dynamic = "force-dynamic";

export default function CeladorPage() {
  return (
    <main className="max-w-2xl mx-auto px-4 sm:px-6 py-5 sm:py-6 space-y-4">
      <h1 className="text-xl font-semibold text-gray-900">Mis traslados</h1>
      <CeladorClient />
    </main>
  );
}