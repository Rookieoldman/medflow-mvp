"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { EmptyState } from "@/components/ui";
import { DifficultyBadge } from "@/components/DifficultyBadge";
import { PriorityBadge }   from "@/components/PriorityBadge";
import { setTransferStatus } from "./actions/setTransferStatus";

/* ── types ── */
type Celador = { id: string; firstName: string | null; lastName1: string | null; email: string } | null;

type Transfer = {
  id:              string;
  mrn:             string;
  patientFullName: string;
  location:        string;
  testType:        string;
  priority:        string;
  difficulty:      string;
  status:          string;
  createdAt:       string;
  assignedTo:      Celador;
};

/* ── constants ── */
const TEST_LABELS: Record<string, string> = {
  RM: "RM", ECO: "Eco", RX: "RX", MEDICINA_NUCLEAR: "Med. Nuclear", TC: "TC",
};

/* Status → mensaje contextual para el técnico */
const STATUS_CTX: Record<string, { label: string; color: string; dot: string }> = {
  SOLICITADO: { label: "Esperando celador disponible",  color: "border-l-amber-400",  dot: "bg-amber-400"  },
  ASIGNADO:   { label: "Celador asignado — pendiente de firma",  color: "border-l-blue-400",   dot: "bg-blue-400"   },
  EN_CURSO:   { label: "Celador en camino con el paciente",      color: "border-l-indigo-400", dot: "bg-indigo-500" },
  EN_PRUEBA:  { label: "Paciente en la sala — prueba en curso",  color: "border-l-violet-500", dot: "bg-violet-500" },
  PAUSADO:    { label: "Traslado pausado",              color: "border-l-orange-400", dot: "bg-orange-400" },
  FINALIZADO: { label: "Prueba finalizada",             color: "border-l-green-500",  dot: "bg-green-500"  },
  CANCELADO:  { label: "Traslado cancelado",            color: "border-l-red-400",    dot: "bg-red-400"    },
};

/* ── elapsed helper ── */
function elapsed(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1)  return "ahora";
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  return m % 60 > 0 ? `${h}h ${m % 60}m` : `${h}h`;
}

function celadorName(c: Celador) {
  if (!c) return null;
  return [c.firstName, c.lastName1].filter(Boolean).join(" ") || c.email;
}

/* ── card component ── */
function TransferCard({
  t,
  onAction,
}: {
  t: Transfer;
  onAction: (transferId: string, next: string) => void;
}) {
  const [pending, startTransition] = useTransition();
  const ctx = STATUS_CTX[t.status] ?? { label: t.status, color: "border-l-gray-300", dot: "bg-gray-400" };

  function doAction(next: string) {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("transferId", t.id);
      fd.set("next", next);
      await setTransferStatus(fd);
      onAction(t.id, next);
    });
  }

  return (
    <div
      className={`border-l-4 ${ctx.color} border border-gray-200 rounded-xl bg-white shadow-sm overflow-hidden`}
    >
      {/* ── CABECERA ── */}
      <div className="px-4 pt-4 pb-3 space-y-2">
        {/* fila superior: MRN + tiempo */}
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-xs text-gray-400">{t.mrn}</span>
          <span className="text-xs text-gray-400 tabular-nums">{elapsed(t.createdAt)}</span>
        </div>

        {/* paciente + ubicación */}
        <div>
          <p className="font-semibold text-gray-900 text-sm sm:text-base truncate">
            {t.patientFullName}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            📍 {t.location} · {TEST_LABELS[t.testType] ?? t.testType}
          </p>
        </div>

        {/* badges */}
        <div className="flex flex-wrap gap-1.5">
          <PriorityBadge   priority={t.priority} />
          <DifficultyBadge difficulty={t.difficulty} />
        </div>
      </div>

      {/* ── ESTADO + CELADOR ── */}
      <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-100 flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full shrink-0 ${ctx.dot}`} />
        <span className="text-xs text-gray-600 flex-1">{ctx.label}</span>
        {celadorName(t.assignedTo) && (
          <span className="text-xs text-gray-400 shrink-0 truncate max-w-[100px]">
            👤 {celadorName(t.assignedTo)}
          </span>
        )}
      </div>

      {/* ── ACCIÓN técnico: solo EN_CURSO → EN_PRUEBA ── */}
      {t.status === "EN_CURSO" && (
        <div className="px-4 py-3 border-t border-gray-100 flex flex-wrap gap-2">
          <button
            disabled={pending}
            onClick={() => doAction("EN_PRUEBA")}
            className="flex-1 sm:flex-none bg-violet-600 text-white text-sm font-medium rounded-lg px-4 py-2 hover:bg-violet-700 disabled:opacity-50 transition-colors"
          >
            {pending ? "…" : "✓ Paciente en la sala"}
          </button>
          <Link
            href={`/tecnico/transfers/${t.id}`}
            className="text-xs font-medium text-gray-400 hover:text-gray-700 self-center px-2"
          >
            Detalle →
          </Link>
        </div>
      )}

      {/* EN_PRUEBA — el celador finaliza */}
      {t.status === "EN_PRUEBA" && (
        <div className="px-4 py-3 border-t border-violet-100 bg-violet-50 flex items-center justify-between gap-2">
          <p className="text-xs text-violet-700 font-medium">
            🔬 Prueba en curso — el celador finalizará el traslado
          </p>
          <Link
            href={`/tecnico/transfers/${t.id}`}
            className="text-xs font-medium text-violet-600 hover:text-violet-800 shrink-0"
          >
            Detalle →
          </Link>
        </div>
      )}

      {/* sin acciones: solo enlace al detalle */}
      {t.status !== "EN_CURSO" && t.status !== "EN_PRUEBA" && (
        <div className="px-4 py-2.5 border-t border-gray-100 flex justify-end">
          <Link
            href={`/tecnico/transfers/${t.id}`}
            className="text-xs font-medium text-blue-600 hover:text-blue-800"
          >
            Ver detalle →
          </Link>
        </div>
      )}
    </div>
  );
}

/* ── main component ── */
export default function TecnicoClient() {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading,   setLoading]   = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchTransfers = async () => {
    const res = await fetch("/api/tecnico/transfers");
    if (res.ok) setTransfers(await res.json());
    setLoading(false);
  };

  useEffect(() => {
    fetchTransfers();
    // Polling de respaldo cada 15 s
    intervalRef.current = setInterval(fetchTransfers, 15_000);

    // SSE: refresco inmediato al recibir cualquier evento
    const es = new EventSource("/api/events");
    es.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data);
        if (event.type !== "connected") fetchTransfers();
      } catch { /* ignorar */ }
    };

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      es.close();
    };
  }, []);

  /* Refetch después de una acción sin esperar el intervalo */
  const handleAction = () => {
    setTimeout(fetchTransfers, 800);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-400 py-8">
        <span className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
        Cargando solicitudes...
      </div>
    );
  }

  if (transfers.length === 0) {
    return (
      <EmptyState
        title="No hay solicitudes activas"
        subtitle="Usa el formulario para crear un nuevo traslado"
        icon="🚑"
      />
    );
  }

  /* Separar por grupo de acción: solo EN_CURSO requiere acción del técnico */
  const needsAction = transfers.filter((t) => t.status === "EN_CURSO");
  const waiting     = transfers.filter((t) => t.status !== "EN_CURSO");

  return (
    <div className="space-y-5">
      {/* Requieren atención del técnico */}
      {needsAction.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-orange-600 uppercase tracking-wide flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse inline-block" />
            Requieren tu atención · {needsAction.length}
          </p>
          {needsAction.map((t) => (
            <TransferCard key={t.id} t={t} onAction={handleAction} />
          ))}
        </div>
      )}

      {/* En espera */}
      {waiting.length > 0 && (
        <div className="space-y-3">
          {needsAction.length > 0 && (
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">En espera · {waiting.length}</p>
          )}
          {waiting.map((t) => (
            <TransferCard key={t.id} t={t} onAction={handleAction} />
          ))}
        </div>
      )}

      <p className="text-xs text-gray-300 text-right">Actualiza cada 10 s</p>
    </div>
  );
}
