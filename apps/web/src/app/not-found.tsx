import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-[calc(100vh-57px)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md text-center border border-gray-200 rounded-2xl bg-white shadow-sm px-8 py-10">
        <p className="text-5xl font-bold text-gray-200 tabular-nums">404</p>
        <h1 className="mt-2 text-lg font-semibold text-gray-900">Página no encontrada</h1>
        <p className="mt-2 text-sm text-gray-500">
          La dirección no existe o ha cambiado. Comprueba el enlace o vuelve al inicio.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex justify-center rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
          >
            Ir al inicio
          </Link>
          <Link
            href="/login"
            className="inline-flex justify-center rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Iniciar sesión
          </Link>
        </div>
      </div>
    </main>
  );
}
