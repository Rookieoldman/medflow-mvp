"use client";

import { useEffect, useRef, useState } from "react";
import { MedflowEvent } from "@/lib/eventBus";
import {
  CLIENT_TOAST_EVENT,
  type ClientToastDetail,
  type ClientToastType,
} from "@/lib/clientToast";

/* ── tipos ── */
interface Toast {
  id:      string;
  message: string;
  type:    ClientToastType;
}

/* ── icono por tipo ── */
const ICONS: Record<Toast["type"], string> = {
  info:    "🔔",
  success: "✅",
  warning: "⚠️",
  error:   "❌",
};

const COLORS: Record<Toast["type"], string> = {
  info:    "border-blue-200 bg-blue-50 text-blue-800",
  success: "border-green-200 bg-green-50 text-green-800",
  warning: "border-orange-200 bg-orange-50 text-orange-800",
  error:   "border-red-200 bg-red-50 text-red-900",
};

/* ── helpers de mensaje ── */
function toastFromEvent(event: MedflowEvent): Omit<Toast, "id"> | null {
  switch (event.type) {
    case "transfer:new":
      return {
        type:    "info",
        message: `Nuevo traslado disponible${event.location ? ` — ${event.location}` : ""}`,
      };
    case "transfer:assigned":
      return {
        type:    "info",
        message: `Traslado asignado${event.patientName ? `: ${event.patientName}` : ""}`,
      };
    case "transfer:released":
      return {
        type:    "info",
        message: `Traslado otra vez en cola${event.mrn ? ` · ${event.mrn}` : ""}`,
      };
    case "transfer:status": {
      const labels: Record<string, { msg: string; type: Toast["type"] }> = {
        EN_CURSO:   { msg: "Traslado en curso",         type: "info"    },
        EN_PRUEBA:  { msg: "Paciente en la sala",        type: "info"    },
        FINALIZADO: { msg: "Traslado finalizado",        type: "success" },
        CANCELADO:  { msg: "Traslado cancelado",         type: "warning" },
        PAUSADO:    { msg: "Traslado pausado",           type: "warning" },
        ASIGNADO:   { msg: "Celador asignado al traslado", type: "info"  },
      };
      const info = labels[event.status ?? ""] ?? { msg: `Estado: ${event.status}`, type: "info" as const };
      const suffix = event.patientName ? ` · ${event.patientName}` : event.mrn ? ` · ${event.mrn}` : "";
      return { type: info.type, message: info.msg + suffix };
    }
    default:
      return null;
  }
}

/* ── componente toast individual ── */
function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 5000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div
      className={`flex items-start gap-3 border rounded-xl px-4 py-3 shadow-md text-sm max-w-sm w-full
        animate-in slide-in-from-right-4 fade-in duration-300 ${COLORS[toast.type]}`}
    >
      <span className="text-base shrink-0 mt-0.5">{ICONS[toast.type]}</span>
      <p className="flex-1 font-medium leading-snug">{toast.message}</p>
      <button
        onClick={onDismiss}
        className="shrink-0 opacity-50 hover:opacity-100 transition-opacity text-base leading-none"
      >
        ×
      </button>
    </div>
  );
}

/* ── componente principal ── */
export default function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const esRef = useRef<EventSource | null>(null);

  const addToast = (partial: Omit<Toast, "id">) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev.slice(-4), { ...partial, id }]);
  };

  const dismiss = (id: string) =>
    setToasts((prev) => prev.filter((t) => t.id !== id));

  useEffect(() => {
    function onClientToast(ev: Event) {
      const e = ev as CustomEvent<ClientToastDetail>;
      if (!e.detail?.message) return;
      addToast({
        message: e.detail.message,
        type:    e.detail.type ?? "warning",
      });
    }
    window.addEventListener(CLIENT_TOAST_EVENT, onClientToast);
    return () => window.removeEventListener(CLIENT_TOAST_EVENT, onClientToast);
  }, []);

  useEffect(() => {
    let retryTimeout: ReturnType<typeof setTimeout>;

    function connect() {
      const es = new EventSource("/api/events");
      esRef.current = es;

      es.onmessage = (e) => {
        try {
          const raw = JSON.parse(e.data) as Record<string, unknown>;
          if (raw.type === "connected") return;
          const toast = toastFromEvent(raw as unknown as MedflowEvent);
          if (toast) addToast(toast);
        } catch {
          // ignorar mensajes malformados
        }
      };

      es.onerror = () => {
        es.close();
        // reconectar tras 5 s si la conexión falla
        retryTimeout = setTimeout(connect, 5000);
      };
    }

    connect();

    return () => {
      esRef.current?.close();
      clearTimeout(retryTimeout);
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed z-50 flex flex-col gap-2 items-end pointer-events-none
        bottom-[max(1rem,env(safe-area-inset-bottom))]
        right-[max(1rem,env(safe-area-inset-right))]"
    >
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <ToastItem toast={t} onDismiss={() => dismiss(t.id)} />
        </div>
      ))}
    </div>
  );
}
