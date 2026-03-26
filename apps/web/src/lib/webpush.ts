import webpush from "web-push";
import { prisma } from "./prisma";

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT ?? "mailto:admin@medflow.hospital",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "",
  process.env.VAPID_PRIVATE_KEY ?? ""
);

export interface PushPayload {
  title: string;
  body:  string;
  url?:  string;
}

/**
 * Envía una notificación push a todos los dispositivos de un usuario.
 * Elimina automáticamente las suscripciones expiradas.
 */
export async function sendPushToUser(userId: string, payload: PushPayload) {
  if (!process.env.VAPID_PRIVATE_KEY) return; // no configurado

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
        // 410 Gone = suscripción expirada, la eliminamos
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
    where:  { role: role as any, active: true },
    select: { id: true },
  });

  await Promise.allSettled(users.map((u) => sendPushToUser(u.id, payload)));
}
