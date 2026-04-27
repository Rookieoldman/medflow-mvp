import { createRequire } from "node:module";
import path from "node:path";
import { prisma } from "./prisma";

export interface PushPayload {
  title: string;
  body:  string;
  url?:  string;
}

/** Solo usamos sendNotification y setVapidDetails; tipos explícitos (sin `import("web-push")` para el bundler). */
type WebPushMod = {
  setVapidDetails: (subject: string, publicKey: string, privateKey: string) => void;
  sendNotification: (
    subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
    payload: string
  ) => Promise<unknown>;
};

const requireFromRoot = createRequire(path.join(process.cwd(), "package.json"));
let webpushCache: WebPushMod | null = null;
let vapidReady = false;

function getWebPush(): WebPushMod {
  if (webpushCache) return webpushCache;
  // Carga en runtime desde node_modules; el nombre en dos partes evita análisis estático agresivo.
  const modName = "web" + "-push";
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const webpush = requireFromRoot(modName) as WebPushMod;
  if (!vapidReady && process.env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT ?? "mailto:admin@medflow.hospital",
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "",
      process.env.VAPID_PRIVATE_KEY ?? ""
    );
    vapidReady = true;
  }
  webpushCache = webpush;
  return webpush;
}

/**
 * Envía una notificación push a todos los dispositivos de un usuario.
 * Elimina automáticamente las suscripciones expiradas.
 */
export async function sendPushToUser(userId: string, payload: PushPayload) {
  if (!process.env.VAPID_PRIVATE_KEY) return; // no configurado

  const webpush = getWebPush();

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
  });

  await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload)
        );
      } catch (err: any) {
        if (err?.statusCode === 410 || err?.statusCode === 404) {
          await prisma.pushSubscription.delete({ where: { endpoint: sub.endpoint } }).catch(() => {});
        }
      }
    })
  );
}

/**
 * Envía una notificación push a todos los usuarios con un rol dado.
 */
export async function sendPushToRole(role: string, payload: PushPayload) {
  if (!process.env.VAPID_PRIVATE_KEY) return;

  const users = await prisma.user.findMany({
    where:  { role: role as "TECNICO" | "CELADOR" | "ADMIN", active: true },
    select: { id: true },
  });

  await Promise.allSettled(users.map((u) => sendPushToUser(u.id, payload)));
}
