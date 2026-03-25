export function fDate(d: Date | string): string {
  return new Date(d).toLocaleDateString("es-ES", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

export function fDateTime(d: Date | string): string {
  return new Date(d).toLocaleString("es-ES", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export function fDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function fElapsed(from: Date | string): string {
  const diffMin = Math.floor(
    (Date.now() - new Date(from).getTime()) / 60000
  );
  if (diffMin < 1)  return "ahora";
  if (diffMin < 60) return `${diffMin} min`;
  const h = Math.floor(diffMin / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}
