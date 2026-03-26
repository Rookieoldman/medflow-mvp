"use client";

import { useEffect, useState } from "react";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64  = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw     = window.atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export default function PwaRegister() {
  const [pushEnabled, setPushEnabled] = useState(false);
  const [showBanner,  setShowBanner]  = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    // Registrar Service Worker
    navigator.serviceWorker.register("/sw.js").then((reg) => {
      // Si ya hay suscripción activa, no mostrar banner
      reg.pushManager.getSubscription().then((existing) => {
        if (existing) {
          setPushEnabled(true);
        } else if (Notification.permission === "default") {
          // Mostrar banner suave después de 3 s
          setTimeout(() => setShowBanner(true), 3000);
        }
      });
    });
  }, []);

  async function enablePush() {
    if (!VAPID_PUBLIC_KEY) return;

    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") { setShowBanner(false); return; }

      const reg  = await navigator.serviceWorker.ready;
      const sub  = await reg.pushManager.subscribe({
        userVisibleOnly:      true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      await fetch("/api/push/subscribe", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(sub.toJSON()),
      });

      setPushEnabled(true);
      setShowBanner(false);
    } catch (err) {
      console.error("Push subscription failed:", err);
      setShowBanner(false);
    }
  }

  async function disablePush() {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await fetch("/api/push/unsubscribe", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ endpoint: sub.endpoint }),
      });
      await sub.unsubscribe();
    }
    setPushEnabled(false);
  }

  // Banner de activación de notificaciones
  if (showBanner && !pushEnabled) {
    return (
      <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 z-50 bg-gray-900 text-white rounded-xl shadow-lg p-4 flex items-start gap-3">
        <span className="text-xl shrink-0">🔔</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">Activa las notificaciones</p>
          <p className="text-xs text-gray-400 mt-0.5">
            Recibe avisos cuando te asignen un traslado aunque la app esté cerrada.
          </p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={enablePush}
              className="flex-1 bg-white text-gray-900 text-xs font-semibold rounded-lg py-1.5 hover:bg-gray-100 transition-colors"
            >
              Activar
            </button>
            <button
              onClick={() => setShowBanner(false)}
              className="flex-1 border border-gray-600 text-gray-300 text-xs rounded-lg py-1.5 hover:bg-gray-800 transition-colors"
            >
              Ahora no
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Botón discreto para desactivar si ya está activo (visible en footer o settings)
  if (pushEnabled) {
    return (
      <button
        onClick={disablePush}
        className="text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2"
        title="Desactivar notificaciones push"
      >
        🔔 Notificaciones activas
      </button>
    );
  }

  return null;
}
