/**
 * Una vegada en arrencar el servidor Node: `.env` / `.env.local` prevalen sobre variables
 * exportades al terminal (p. ex. `DATABASE_URL` de MEDHUB).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "edge") return;
  await import("./prisma/load-env");
}
