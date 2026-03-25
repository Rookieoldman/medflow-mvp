"use client";

import { useTransition, useState } from "react";
import { assignTransfer } from "./actions";

type Celador = { id: string; name: string; onBreak?: boolean };

export default function AssignForm({
  transferId,
  celadores,
  currentCeladorId,
}: {
  transferId:       string;
  celadores:        Celador[];
  currentCeladorId?: string;
}) {
  const [selected, setSelected]   = useState(currentCeladorId ?? "");
  const [pending,  startTransition] = useTransition();
  const [done,     setDone]        = useState(false);
  const [error,    setError]       = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setError(null);
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("transferId", transferId);
        fd.set("celadorId",  selected);
        await assignTransfer(fd);
        setDone(true);
      } catch (e: any) {
        setError(e?.message ?? "Error al asignar");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="flex gap-2">
      <select
        value={selected}
        onChange={(e) => { setSelected(e.target.value); setDone(false); }}
        className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-300"
      >
        <option value="">— Seleccionar celador —</option>
        {celadores.map((c) => (
          <option key={c.id} value={c.id}>
            {c.onBreak ? `☕ ${c.name} (descanso)` : c.name}
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={!selected || pending}
        className="px-3 py-1.5 text-xs font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
      >
        {pending ? "…" : done ? "✓ Asignado" : "Asignar"}
      </button>
      </div>
      {error && (
        <p className="text-xs text-red-600 font-medium">⚠ {error}</p>
      )}
    </form>
  );
}
