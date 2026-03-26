// Ejecuta: node scripts/generate-vapid.mjs
// Copia el output en tu .env.local

import webpush from "web-push";

const keys = webpush.generateVAPIDKeys();
console.log("\n✅ Claves VAPID generadas. Añade esto a tu .env.local:\n");
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY="${keys.publicKey}"`);
console.log(`VAPID_PRIVATE_KEY="${keys.privateKey}"`);
console.log(`VAPID_SUBJECT="mailto:admin@medflow.hospital"\n`);
