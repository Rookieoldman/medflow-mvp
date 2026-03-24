/*
  SLA thresholds (minutes) by difficulty + priority combination.

  Logic:
  - CRITICO has tighter thresholds: any delay has greater clinical consequences
  - BANAL has looser thresholds: logistically simpler
  - URGENTE always tightens the threshold regardless of difficulty
*/

type Difficulty = "BANAL" | "MODERADO" | "CRITICO";
type Priority   = "NORMAL" | "URGENTE";

// [difficulty][priority] → minutes per status
const THRESHOLDS: Record<Difficulty, Record<Priority, Record<string, number>>> = {
  BANAL: {
    NORMAL:  { SOLICITADO: 20, ASIGNADO: 15, EN_CURSO: 40, EN_PRUEBA: 90, PAUSADO: 20 },
    URGENTE: { SOLICITADO: 10, ASIGNADO:  8, EN_CURSO: 20, EN_PRUEBA: 45, PAUSADO: 10 },
  },
  MODERADO: {
    NORMAL:  { SOLICITADO: 15, ASIGNADO: 10, EN_CURSO: 30, EN_PRUEBA: 60, PAUSADO: 15 },
    URGENTE: { SOLICITADO:  8, ASIGNADO:  6, EN_CURSO: 15, EN_PRUEBA: 30, PAUSADO:  8 },
  },
  CRITICO: {
    NORMAL:  { SOLICITADO: 10, ASIGNADO:  8, EN_CURSO: 20, EN_PRUEBA: 40, PAUSADO: 10 },
    URGENTE: { SOLICITADO:  5, ASIGNADO:  4, EN_CURSO: 10, EN_PRUEBA: 20, PAUSADO:  5 },
  },
};

export function getSLAThreshold(
  status:     string,
  priority:   string,
  difficulty: string = "MODERADO"
): number {
  const d  = (["BANAL","MODERADO","CRITICO"].includes(difficulty) ? difficulty : "MODERADO") as Difficulty;
  const p  = (priority === "URGENTE" ? "URGENTE" : "NORMAL") as Priority;
  return THRESHOLDS[d][p][status] ?? 15;
}

export function isAtRisk(
  status:     string,
  minutesOpen: number,
  priority:   string,
  difficulty: string = "MODERADO"
): boolean {
  return minutesOpen > getSLAThreshold(status, priority, difficulty);
}

export type SLABadge = { label: string; color: string; risk: boolean };

export function getSLABadge(
  status:     string,
  minutesOpen: number,
  priority:   string,
  difficulty: string = "MODERADO"
): SLABadge {
  const threshold = getSLAThreshold(status, priority, difficulty);

  if (minutesOpen > threshold) {
    return { label: "En riesgo", color: "bg-red-500 text-white",         risk: true  };
  }
  if (minutesOpen > threshold * 0.7) {
    return { label: "Atención",  color: "bg-yellow-400 text-yellow-900", risk: false };
  }
  return   { label: "OK",        color: "bg-green-500 text-white",        risk: false };
}

/* ────────────────────────────────────────────────
   Weighted score for statistics (load comparison)
   BANAL=1  MODERADO=2  CRITICO=3
──────────────────────────────────────────────── */
export const DIFFICULTY_WEIGHT: Record<string, number> = {
  BANAL:    1,
  MODERADO: 2,
  CRITICO:  3,
};
