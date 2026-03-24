const STATUS_CONFIG: Record<string, { label: string; classes: string }> = {
  SOLICITADO: { label: "Solicitado", classes: "bg-gray-50 text-gray-700 border-gray-200"      },
  ASIGNADO:   { label: "Asignado",   classes: "bg-blue-50 text-blue-700 border-blue-200"      },
  EN_CURSO:   { label: "En curso",   classes: "bg-amber-50 text-amber-800 border-amber-200"   },
  EN_PRUEBA:  { label: "En prueba",  classes: "bg-violet-50 text-violet-800 border-violet-200"},
  PAUSADO:    { label: "Pausado",    classes: "bg-orange-50 text-orange-800 border-orange-200"},
  FINALIZADO: { label: "Finalizado", classes: "bg-green-50 text-green-800 border-green-200"  },
  CANCELADO:  { label: "Cancelado",  classes: "bg-red-50 text-red-800 border-red-200"        },
};

export function StatusBadge({ status }: { status: string }) {
  const base = "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border";
  const cfg = STATUS_CONFIG[status];

  if (cfg) {
    return <span className={`${base} ${cfg.classes}`}>{cfg.label}</span>;
  }

  // Fallback para valores desconocidos
  const label = status.replaceAll("_", " ").toLowerCase().replace(/(^|\s)\S/g, (t) => t.toUpperCase());
  return <span className={`${base} bg-gray-100 text-gray-600 border-gray-200`}>{label}</span>;
}
