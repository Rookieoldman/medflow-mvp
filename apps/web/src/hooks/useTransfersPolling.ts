"use client";

import { useEffect, useRef, useState } from "react";

type Transfer = {
  id: string;
  priority: "NORMAL" | "URGENTE";
  status: string;
};

type Options<T> = {
  endpoint: string;
  stopStatuses: string[];
};

export function useTransfersPolling<T extends Transfer>({
  endpoint,
  stopStatuses,
}: Options<T>) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  async function load() {
    const res = await fetch(endpoint, { cache: "no-store" });
    if (!res.ok) return;

    const json = await res.json();
    setData(json);
    setLoading(false);
  }

  useEffect(() => {
    load();

    function startPolling(intervalMs: number) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(load, intervalMs);
    }

    // ⏱️ decidir intervalo dinámicamente
    const hasUrgent = data.some(
      (t) =>
        t.priority === "URGENTE" &&
        !stopStatuses.includes(t.status)
    );

    const hasActive = data.some(
      (t) => !stopStatuses.includes(t.status)
    );

    if (!hasActive) {
      // 🛑 todo terminado → parar polling
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    startPolling(hasUrgent ? 5000 : 15000);

    // 👁️ pausar si la pestaña no está activa
    function onVisibilityChange() {
      if (document.hidden) {
        if (intervalRef.current) clearInterval(intervalRef.current);
      } else {
        load();
        startPolling(hasUrgent ? 5000 : 15000);
      }
    }

    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [endpoint, data.length]);

  return { data, loading };
}