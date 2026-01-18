import { seedUsers } from "./users.seed";

async function main() {
  console.log("🌱 Ejecutando seeds...");
  await seedUsers();
  console.log("🌱 Seeds completadas");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});