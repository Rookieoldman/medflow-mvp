export function StatusBadge({ status }: { status: string }) {
  const s = status;

  const base =
    "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border";

  const cls =
    s === "SOLICITADO"
      ? "bg-gray-50 text-gray-700 border-gray-200"
      : s === "ASIGNADO"
        ? "bg-blue-50 text-blue-700 border-blue-200"
        : s === "EN_CURSO"
          ? "bg-amber-50 text-amber-800 border-amber-200"
          : s === "EN_CAMINO_PRUEBA"
            ? "bg-cyan-50 text-cyan-800 border-cyan-200"
            : s === "EN_ESPERA"
              ? "bg-yellow-50 text-yellow-800 border-yellow-200"
              : s === "EN_LA_PRUEBA"
                ? "bg-violet-50 text-violet-800 border-violet-200"
                : s === "VUELTA"
                  ? "bg-indigo-50 text-indigo-800 border-indigo-200"
                  : s === "PAUSADO"
                    ? "bg-orange-50 text-orange-800 border-orange-200"
                    : s === "FINALIZADO"
                      ? "bg-green-50 text-green-800 border-green-200"
                      : "bg-red-50 text-red-800 border-red-200";

  // Pequeño “label” más humano
  const label = s
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/(^|\s)\S/g, (t) => t.toUpperCase());

  return <span className={`${base} ${cls}`}>{label}</span>;
}
