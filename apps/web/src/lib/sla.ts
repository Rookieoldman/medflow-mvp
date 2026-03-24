const THRESHOLDS: Record<string, number> = {
  SOLICITADO: 15,
  ASIGNADO:   10,
  EN_CURSO:   30,
  EN_PRUEBA:  60,
  PAUSADO:    15,
};

export function getSLAThreshold(status: string, priority: string): number {
  if (priority === "URGENTE") return 5;
  return THRESHOLDS[status] ?? 15;
}

export function isAtRisk(
  status: string,
  minutesOpen: number,
  priority: string
): boolean {
  return minutesOpen > getSLAThreshold(status, priority);
}

export type SLABadge = { label: string; color: string; risk: boolean };

export function getSLABadge(
  status: string,
  minutesOpen: number,
  priority: string
): SLABadge {
  const threshold = getSLAThreshold(status, priority);

  if (minutesOpen > threshold) {
    return { label: "En riesgo", color: "bg-red-500 text-white", risk: true };
  }
  if (minutesOpen > threshold * 0.7) {
    return { label: "Atención", color: "bg-yellow-400 text-yellow-900", risk: false };
  }
  return { label: "OK", color: "bg-green-500 text-white", risk: false };
}
