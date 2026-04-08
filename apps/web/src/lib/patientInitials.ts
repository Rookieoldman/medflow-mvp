/**
 * Iniciales para listados (sin enviar el nombre completo en la API).
 * Orden: **Nombre + primer apellido + segundo apellido** → primera letra de cada uno,
 * en el mismo orden en que vengan las tres primeras palabras en `patientFullName`
 * (convención: "Nombre Apellido1 Apellido2").
 */
export function initialsFromPatientFullName(fullName: string): string {
  const words = fullName.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";

  const letters: string[] = [];
  for (let i = 0; i < Math.min(3, words.length); i++) {
    const c = words[i]![0];
    if (c) letters.push(c);
  }
  return letters.join("").toUpperCase() || "?";
}
