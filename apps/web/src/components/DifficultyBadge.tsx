const DIFFICULTY_CONFIG: Record<
  string,
  { label: string; dot: string; bg: string; text: string; border: string }
> = {
  BANAL: {
    label:  "Banal",
    dot:    "bg-green-500",
    bg:     "bg-green-50",
    text:   "text-green-800",
    border: "border-green-200",
  },
  MODERADO: {
    label:  "Moderado",
    dot:    "bg-yellow-400",
    bg:     "bg-yellow-50",
    text:   "text-yellow-800",
    border: "border-yellow-200",
  },
  CRITICO: {
    label:  "Crítico",
    dot:    "bg-red-500",
    bg:     "bg-red-50",
    text:   "text-red-800",
    border: "border-red-200",
  },
};

export function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const cfg = DIFFICULTY_CONFIG[difficulty] ?? DIFFICULTY_CONFIG.MODERADO;
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.text} ${cfg.border}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

export { DIFFICULTY_CONFIG };
