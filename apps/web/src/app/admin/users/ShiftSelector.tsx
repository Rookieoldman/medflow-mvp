"use client";

import { useTransition, useState } from "react";
import { setShift } from "./shiftActions";

const SHIFT_OPTIONS = [
  { value: "OFF",    label: "Fuera de turno" },
  { value: "MANANA", label: "Mañana"         },
  { value: "TARDE",  label: "Tarde"          },
  { value: "NOCHE",  label: "Noche"          },
];

const SHIFT_COLORS: Record<string, string> = {
  MANANA: "text-yellow-600 bg-yellow-50 border-yellow-200",
  TARDE:  "text-orange-600 bg-orange-50 border-orange-200",
  NOCHE:  "text-indigo-600 bg-indigo-50 border-indigo-200",
};

export default function ShiftSelector({
  userId,
  currentShift,
}: {
  userId:       string;
  currentShift: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [value,   setValue]        = useState(currentShift ?? "OFF");

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value;
    setValue(next);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("userId", userId);
      fd.set("shift",  next);
      await setShift(fd);
    });
  }

  const colorClass = value !== "OFF" ? (SHIFT_COLORS[value] ?? "") : "text-gray-400 bg-white border-gray-200";

  return (
    <select
      value={value}
      onChange={handleChange}
      disabled={pending}
      className={`text-xs font-medium border rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-gray-300 disabled:opacity-50 transition-colors cursor-pointer ${colorClass}`}
    >
      {SHIFT_OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}
