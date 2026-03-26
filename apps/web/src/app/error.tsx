"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const isDev = process.env.NODE_ENV === "development";

  return (
    <main className="min-h-[calc(100vh-57px)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md text-center border border-red-100 rounded-2xl bg-white shadow-sm px-8 py-10">
        <span className="text-4xl" aria-hidden>
          ⚠️
        </span>
        <h1 className="mt-3 text-lg font-semibold text-gray-900">Algo ha salido mal</h1>
        <p className="mt-2 text-sm text-gray-500">
          No se ha podido completar la acción. Puedes reintentar o volver al inicio.
        </p>
        {isDev && error.message && (
          <pre className="mt-4 text-left text-xs text-red-800 bg-red-50 border border-red-100 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-words">
            {error.message}
            {error.digest ? `\n(digest: ${error.digest})` : ""}
          </pre>
        )}
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex justify-center rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
          >
            Reintentar
          </button>
          <Link
            href="/"
            className="inline-flex justify-center rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Ir al inicio
          </Link>
        </div>
      </div>
    </main>
  );
}
