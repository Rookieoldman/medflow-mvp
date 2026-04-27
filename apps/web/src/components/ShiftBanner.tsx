"use client";

import { useTransition, useState, useEffect } from "react";
import { selfChangeShift } from "@/app/actions/selfChangeShift";

const SHIFT_OPTIONS = [
  { value: "MANANA", label: "☀️ Mañana (08–15h)",  color: "bg-yellow-50 border-yellow-300 text-yellow-800" },
  { value: "TARDE",  label: "🌆 Tarde  (15–22h)",  color: "bg-orange-50 border-orange-300 text-orange-800" },
  { value: "NOCHE",  label: "🌙 Noche  (22–08h)",  color: "bg-indigo-50 border-indigo-300 text-indigo-800" },
  { value: "OFF",    label: "Fuera de turno",       color: "bg-gray-50  border-gray-200  text-gray-500"    },
] as const;

type ShiftValue = typeof SHIFT_OPTIONS[number]["value"];

function getOption(v: string | null) {
  return SHIFT_OPTIONS.find((o) => o.value === (v ?? "OFF")) ?? SHIFT_OPTIONS[3];
}

export default function ShiftBanner({
  currentShift,
}: {
  currentShift: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [value,   setValue]        = useState<ShiftValue>((currentShift ?? "OFF") as ShiftValue);
  const [saved,   setSaved]        = useState(false);
  const [error,   setError]        = useState<string | null>(null);

  // sync if parent re-renders with a new currentShift
  useEffect(() => {
    setValue((currentShift ?? "OFF") as ShiftValue);
  }, [currentShift]);

  const current = getOption(value);

  function handleChange(next: ShiftValue) {
    const prev = value;
    setValue(next);
    setSaved(false);
    setError(null);
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("shift", next);
        await selfChangeShift(fd);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } catch (e) {
        setValue(prev); // revert on error
        setError(e instanceof Error ? e.message : "Error al cambiar turno");
      }
    });
  }

  return (
    <div className={`rounded-xl border px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3 ${current.color}`}>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide opacity-60 mb-0.5">Mi turno actual</p>
        <p className="font-semibold text-sm">{current.label}</p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <select
          value={value}
          onChange={(e) => handleChange(e.target.value as ShiftValue)}
          disabled={pending}
          className="text-xs border border-current/30 rounded-lg px-2.5 py-1.5 bg-white/70 focus:outline-none focus:ring-2 focus:ring-current/30 disabled:opacity-50 cursor-pointer font-medium"
        >
          {SHIFT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {pending && (
          <span className="text-xs opacity-60 animate-pulse">Guardando…</span>
        )}
        {saved && !pending && (
          <span className="text-xs font-medium opacity-80">✓ Guardado</span>
        )}
      </div>
      {error && (
        <p className="text-xs text-red-600 font-medium mt-1">{error}</p>
      )}
    </div>
  );
}
