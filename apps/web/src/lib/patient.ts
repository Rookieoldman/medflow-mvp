export function initials(fullName: string) {
  // Formato esperado: "Apellido1 Apellido2, Nombre"
  const [surnamesPart, namePart] = fullName.split(",");

  const initials: string[] = [];

  // Iniciales del nombre (puede tener más de una palabra)
  if (namePart) {
    const names = namePart.trim().split(/\s+/);
    for (const n of names) {
      if (n[0]) initials.push(n[0]);
    }
  }

  // Iniciales de los apellidos
  if (surnamesPart) {
    const surnames = surnamesPart.trim().split(/\s+/);
    for (const s of surnames) {
      if (s[0]) initials.push(s[0]);
    }
  }

  return initials.join("").toUpperCase();
}