"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";

import {
  assignToMe,
  setStatus,
  pauseTransfer,
  resumeTransfer,
  acceptTransfer,
  startBreak,
  endBreak,
  setOwnShift,
  releaseTransferToPool,
} from "./serverActions";

import SignatureModal  from "@/components/SignatureModal";
import {
  showClientToast,
  getUserActionErrorMessage,
  requestCeladorTransfersRefresh,
  CELADOR_REFRESH_EVENT,
} from "@/lib/clientToast";
import { PriorityBadge }   from "@/components/PriorityBadge";
import { DifficultyBadge } from "@/components/DifficultyBadge";
import { StatusBadge }     from "@/components/StatusBadge";
import { EmptyState }      from "@/components/ui";
import LoadingInline from "@/components/LoadingInline";
import ElapsedTime   from "@/components/ElapsedTime";

/* ── Countdown del descanso ── */
function BreakCountdown({ breakUntil }: { breakUntil: string }) {
  const [remaining, setRemaining] = useState(() =>
    Math.max(0, Math.floor((new Date(breakUntil).getTime() - Date.now()) / 1000))
  );

  useEffect(() => {
    const t = setInterval(() => {
      setRemaining((r) => Math.max(0, r - 1));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const m = Math.floor(remaining / 60).toString().padStart(2, "0");
  const s = (remaining % 60).toString().padStart(2, "0");
  return <span className="font-mono font-bold tabular-nums">{m}:{s}</span>;
}

type Transfer = {
  id:                string;
  mrn:               string;
  patientInitials:   string;
  location:          string;
  testType:          string;
  priority:          string;
  status:            string;
  difficulty:        string;
  createdAt:         string;
  requiresAcceptance?: boolean;
};

const TEST_LABELS: Record<string, string> = {
  RM: "RM", ECO: "Eco", RX: "RX", MEDICINA_NUCLEAR: "Med. Nuclear", TC: "TC",
};

const DIFFICULTY_BORDER: Record<string, string> = {
  CRITICO:  "border-l-red-500",
  MODERADO: "border-l-yellow-400",
  BANAL:    "border-l-green-400",
};

const SHIFT_LABEL: Record<string, string> = {
  MANANA: "☀️ Turno de mañana  (08–15h)",
  TARDE:  "🌆 Turno de tarde   (15–22h)",
  NOCHE:  "🌙 Turno de noche   (22–08h)",
};

const SHIFT_COLOR: Record<string, string> = {
  MANANA: "bg-yellow-50 text-yellow-700 border-yellow-200",
  TARDE:  "bg-orange-50 text-orange-700 border-orange-200",
  NOCHE:  "bg-indigo-50 text-indigo-700 border-indigo-200",
};

const STATUS_CTX: Record<string, string> = {
  ASIGNADO:  "Pendiente de firma del responsable",
  EN_CURSO:  "Traslado en curso",
  PAUSADO:   "Traslado pausado",
  EN_PRUEBA: "Paciente en la sala — prueba en curso",
};

const BTN =
  "inline-flex items-center justify-center min-h-11 px-3 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed";

/* ── Sección "Disponibles" con filtros ── */
function AvailableSection({
  available,
  pendingId,
  onBreak,
  onAssign,
}: {
  available: Transfer[];
  pendingId: string | null;
  onBreak:   boolean;
  onAssign:  (id: string) => void;
}) {
  const [search,      setSearch]      = useState("");
  const [difficulty,  setDifficulty]  = useState("");
  const [priority,    setPriority]    = useState("");

  const filtered = available.filter((t) => {
    if (difficulty && t.difficulty !== difficulty) return false;
    if (priority   && t.priority   !== priority)   return false;
    if (search) {
      const q = search.toLowerCase();
      if (
        !t.location.toLowerCase().includes(q) &&
        !t.mrn.toLowerCase().includes(q)
      ) return false;
    }
    return true;
  });

  const hasFilters = search || difficulty || priority;

  return (
    <section className="space-y-3">
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-gray-900">
            Disponibles
            {available.length > 0 && (
              <span className="ml-2 text-sm font-normal text-gray-400">· {filtered.length}{hasFilters ? `/${available.length}` : ""}</span>
            )}
          </h2>
        </div>
        <p className="text-sm text-gray-500 leading-snug">
          Nuevas solicitudes y, si aparecen, traslados sin responsable (p. ej. tras cambio de turno).
        </p>
      </div>

      {/* Filtros */}
      {available.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[160px]">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">🔍</span>
            <input
              type="text"
              placeholder="Ubicación o Nº historia…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border border-gray-200 rounded-lg pl-7 pr-3 py-2.5 min-h-11 text-sm w-full focus:outline-none focus:ring-2 focus:ring-gray-200 bg-white"
            />
          </div>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            className="border border-gray-200 rounded-lg px-2.5 py-2 min-h-11 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-200"
          >
            <option value="">Dificultad</option>
            <option value="CRITICO">🔴 Crítico</option>
            <option value="MODERADO">🟡 Moderado</option>
            <option value="BANAL">🟢 Banal</option>
          </select>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="border border-gray-200 rounded-lg px-2.5 py-2 min-h-11 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-200"
          >
            <option value="">Prioridad</option>
            <option value="URGENTE">🔴 Urgente</option>
            <option value="NORMAL">⚪ Normal</option>
          </select>
          {hasFilters && (
            <button
              type="button"
              onClick={() => { setSearch(""); setDifficulty(""); setPriority(""); }}
              className="inline-flex items-center justify-center min-h-11 border border-gray-200 rounded-lg px-3 text-sm text-gray-500 hover:bg-gray-50"
            >
              Limpiar
            </button>
          )}
        </div>
      )}

      {available.length === 0 ? (
        <EmptyState title="Sin solicitudes disponibles" subtitle="Se actualizará automáticamente" icon="⏳" />
      ) : filtered.length === 0 ? (
        <EmptyState title="Sin resultados" subtitle="Prueba con otros filtros" icon="🔍" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtered.map((t) => (
            <div
              key={t.id}
              className={`border-l-4 ${DIFFICULTY_BORDER[t.difficulty] ?? "border-l-gray-300"} border border-gray-200 rounded-xl bg-white shadow-sm flex flex-col`}
            >
              {/* Cuerpo: fila identidad + contexto (patrón lista / tarea) */}
              <div className="p-4 flex-1 space-y-3">
                <div className="flex gap-3.5 items-start">
                  <div
                    className="w-[4.25rem] h-[4.25rem] rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200/90 flex items-center justify-center text-gray-700 text-lg font-bold shrink-0 tracking-tight shadow-sm"
                    title="Iniciales: nombre + apellidos (orden en ficha). Identificación completa en detalle."
                  >
                    {t.patientInitials}
                  </div>
                  <div className="flex-1 min-w-0 space-y-1.5 pt-0.5 overflow-hidden pr-1">
                    <p
                      className="font-mono text-sm font-semibold text-gray-900 tabular-nums truncate"
                      title={t.mrn}
                    >
                      {t.mrn}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <Link
                        href={`/celador/transfer/${t.id}`}
                        className="inline-flex items-center min-h-11 -ml-1 px-1 text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline shrink-0 rounded-lg active:bg-blue-50"
                      >
                        Ver ficha
                      </Link>
                      {t.status !== "SOLICITADO" && (
                        <span
                          className="text-[10px] font-medium text-amber-800 bg-amber-50 border border-amber-100 rounded-md px-2 py-0.5 shrink-0"
                          title="Quedó sin celador (p. ej. cambio de turno o baja); puedes retomarlo"
                        >
                          Sin responsable
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">
                        Origen
                      </p>
                      <p className="font-semibold text-gray-900 text-sm sm:text-base leading-snug">
                        {t.location}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Prueba: {TEST_LABELS[t.testType] ?? t.testType}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 flex flex-col items-end gap-1.5 text-right pt-0.5 pl-1 min-w-[5.25rem]">
                    <ElapsedTime createdAt={t.createdAt} />
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-0.5 border-t border-gray-100">
                  <DifficultyBadge difficulty={t.difficulty} />
                  <PriorityBadge   priority={t.priority} />
                </div>
              </div>

              {/* CTA */}
              <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 rounded-b-xl">
                <button
                  type="button"
                  disabled={!!pendingId || onBreak}
                  onClick={() => onAssign(t.id)}
                  className="w-full min-h-12 bg-gray-900 text-white text-base font-medium rounded-lg py-3 hover:bg-gray-700 disabled:opacity-40 transition-colors"
                >
                  {onBreak ? "☕ En descanso" : pendingId === t.id ? "Asignando…" : "Asignarme este traslado"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default function CeladorClient() {
  const [available,  setAvailable]  = useState<Transfer[]>([]);
  const [mine,       setMine]       = useState<Transfer[]>([]);
  const [pendingId,  setPendingId]  = useState<string | null>(null);
  const [openSig,    setOpenSig]    = useState<string | null>(null);
  const [onBreak,        setOnBreak]        = useState(false);
  const [breakUntil,     setBreakUntil]     = useState<string | null>(null);
  const [breakAvailable, setBreakAvailable] = useState(true);
  const [currentShift,   setCurrentShift]   = useState<string | null>(null);
  const [shiftOpen,      setShiftOpen]      = useState(false);
  const [breakPending,   startBreakTransition] = useTransition();
  const [shiftPending,   startShiftTransition] = useTransition();
  const breakTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingIdRef = useRef<string | null>(null);
  pendingIdRef.current = pendingId;

  useEffect(() => {
    const fetchData = async () => {
      const res = await fetch("/api/celador/transfers");
      if (!res.ok) return;
      const data = await res.json();
      setAvailable(data.available ?? []);
      setMine(data.mine ?? []);
      setOnBreak(data.onBreak ?? false);
      setBreakUntil(data.breakUntil ?? null);
      setBreakAvailable(data.breakAvailable ?? true);
      setCurrentShift(data.currentShift ?? null);
      const pid = pendingIdRef.current;
      if (pid) {
        const exists =
          data.available?.some((t: Transfer) => t.id === pid) ||
          data.mine?.some((t: Transfer) => t.id === pid);
        if (!exists) setPendingId(null);
      }
    };

    const onManualRefresh = () => {
      void fetchData();
    };
    window.addEventListener(CELADOR_REFRESH_EVENT, onManualRefresh);

    fetchData();
    // Polling de respaldo cada 10 s
    const poll = setInterval(fetchData, 10_000);

    // SSE: refresco inmediato cuando llega cualquier evento relevante
    const es = new EventSource("/api/events");
    es.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data);
        if (event.type !== "connected") fetchData();
      } catch { /* ignorar */ }
    };

    return () => {
      window.removeEventListener(CELADOR_REFRESH_EVENT, onManualRefresh);
      clearInterval(poll);
      es.close();
    };
  }, []);

  const run = async (
    id: string,
    action: (fd: FormData) => Promise<void>,
    extra?: (fd: FormData) => void
  ) => {
    if (pendingId) return;
    setPendingId(id);
    const fd = new FormData();
    fd.set("transferId", id);
    extra?.(fd);
    try {
      await action(fd);
    } catch (e) {
      console.error(e);
      const msg = getUserActionErrorMessage(e);
      showClientToast(msg, "error");
      if (
        msg.includes("Otro celador") ||
        msg.includes("ya asignado") ||
        msg.includes("no está disponible para asignación")
      ) {
        requestCeladorTransfersRefresh();
      }
    } finally {
      setPendingId(null);
    }
  };

  function handleBreakToggle() {
    startBreakTransition(async () => {
      try {
        if (onBreak) {
          await endBreak();
          setOnBreak(false);
          setBreakUntil(null);
          if (breakTimerRef.current) clearTimeout(breakTimerRef.current);
        } else {
          await startBreak();
          const until = new Date(Date.now() + 20 * 60 * 1000).toISOString();
          setOnBreak(true);
          setBreakUntil(until);
          setBreakAvailable(false);
          if (breakTimerRef.current) clearTimeout(breakTimerRef.current);
          breakTimerRef.current = setTimeout(() => {
            setOnBreak(false);
            setBreakUntil(null);
          }, 20 * 60 * 1000);
        }
      } catch (e) {
        console.error(e);
        showClientToast(getUserActionErrorMessage(e), "error");
      }
    });
  }

  const SHIFTS = [
    { value: "MANANA", label: "☀️ Mañana",  sub: "08–15h" },
    { value: "TARDE",  label: "🌆 Tarde",   sub: "15–22h" },
    { value: "NOCHE",  label: "🌙 Noche",   sub: "22–08h" },
  ] as const;

  function handleShiftChange(shift: "MANANA" | "TARDE" | "NOCHE" | "OFF") {
    startShiftTransition(async () => {
      try {
        await setOwnShift(shift);
        setCurrentShift(shift === "OFF" ? null : shift);
        setShiftOpen(false);
      } catch (e) {
        console.error(e);
        showClientToast(getUserActionErrorMessage(e), "error");
      }
    });
  }

  return (
    <>
      {/* ════════════════════════════════════════
          TURNO ACTIVO
      ════════════════════════════════════════ */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {currentShift ? (
            <span className={`text-sm font-medium border rounded-lg px-3 py-2 ${SHIFT_COLOR[currentShift] ?? ""}`}>
              {SHIFT_LABEL[currentShift] ?? currentShift}
            </span>
          ) : (
            <span className="text-sm text-gray-500 border border-dashed border-gray-300 rounded-lg px-3 py-2">
              Sin turno asignado
            </span>
          )}
          <button
            type="button"
            onClick={() => setShiftOpen((v) => !v)}
            disabled={shiftPending}
            className="inline-flex items-center justify-center min-h-11 px-2 -mx-1 text-sm text-gray-600 hover:text-gray-900 underline underline-offset-2 rounded-lg active:bg-gray-100 disabled:opacity-40"
          >
            {shiftPending ? "Guardando…" : "Cambiar turno"}
          </button>
        </div>
      </div>

      {/* ── Selector de turno ── */}
      {shiftOpen && (
        <div className="border border-gray-200 rounded-xl bg-white shadow-sm p-3 space-y-2">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Selecciona tu turno</p>
          <div className="flex flex-wrap gap-2">
            {SHIFTS.map(({ value, label, sub }) => (
              <button
                type="button"
                key={value}
                disabled={shiftPending}
                onClick={() => handleShiftChange(value)}
                className={`flex-1 min-w-[90px] min-h-12 border rounded-lg px-3 py-2.5 text-sm font-medium transition-colors disabled:opacity-40 ${
                  currentShift === value
                    ? "bg-gray-900 text-white border-gray-900"
                    : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                }`}
              >
                <span className="block">{label}</span>
                <span className="block text-xs opacity-60">{sub}</span>
              </button>
            ))}
            {currentShift && (
              <button
                type="button"
                disabled={shiftPending}
                onClick={() => handleShiftChange("OFF")}
                className="inline-flex items-center justify-center min-h-11 border border-dashed border-gray-300 rounded-lg px-3 text-sm text-gray-500 hover:bg-gray-50 disabled:opacity-40 transition-colors"
              >
                Quitar turno
              </button>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════
          ESTADO DE DESCANSO
      ════════════════════════════════════════ */}
      {onBreak && breakUntil ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <p className="text-sm font-semibold text-amber-800">☕ En descanso</p>
            <p className="text-xs text-amber-600">
              No recibirás traslados — quedan <BreakCountdown breakUntil={breakUntil} />
            </p>
          </div>
          <button
            type="button"
            disabled={breakPending}
            onClick={handleBreakToggle}
            className="shrink-0 inline-flex items-center justify-center min-h-11 border border-amber-300 bg-white text-amber-800 text-sm font-medium rounded-lg px-4 py-2 hover:bg-amber-100 disabled:opacity-50 transition-colors"
          >
            Volver antes
          </button>
        </div>
      ) : (
        <div className="flex justify-end">
          {breakAvailable ? (
            <button
              type="button"
              disabled={breakPending || !!pendingId}
              onClick={handleBreakToggle}
              className="inline-flex items-center justify-center min-h-11 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg px-4 py-2 hover:bg-gray-50 disabled:opacity-40 transition-colors"
            >
              ☕ Iniciar descanso (20 min)
            </button>
          ) : (
            <span className="text-xs text-gray-400 italic">
              ✓ Descanso ya utilizado hoy
            </span>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════
          DISPONIBLES — tarjetas tipo "solicitud"
      ════════════════════════════════════════ */}
      <AvailableSection
        available={available}
        pendingId={pendingId}
        onBreak={onBreak}
        onAssign={(id) => run(id, assignToMe)}
      />

      {/* ════════════════════════════════════════
          MIS TRASLADOS — acciones de transporte
      ════════════════════════════════════════ */}
      <section className="space-y-3 mt-8">
        <h2 className="text-base font-semibold text-gray-900">
          Mis traslados
          {mine.length > 0 && (
            <span className="ml-2 text-sm font-normal text-gray-400">· {mine.length}</span>
          )}
        </h2>

        {mine.length === 0 ? (
          <EmptyState title="No tienes traslados activos" icon="✅" />
        ) : (
          <div className="space-y-3">
            {mine.map((t) => {
              const disabled = pendingId === t.id;

              return (
                <div
                  key={t.id}
                  className={`border-l-4 ${DIFFICULTY_BORDER[t.difficulty] ?? "border-l-gray-300"} border border-gray-200 rounded-xl bg-white shadow-sm`}
                >
                  {/* Info */}
                  <div className="p-4 space-y-3">
                    <div className="flex gap-3.5 items-start">
                      <div
                        className="w-[4.25rem] h-[4.25rem] rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200/90 flex items-center justify-center text-gray-700 text-lg font-bold shrink-0 tracking-tight shadow-sm"
                        title="Iniciales: nombre + apellidos (orden en ficha). Identificación completa en detalle."
                      >
                        {t.patientInitials}
                      </div>
                      <div className="flex-1 min-w-0 space-y-1.5 pt-0.5 overflow-hidden pr-1">
                        <p
                          className="font-mono text-sm font-semibold text-gray-900 tabular-nums truncate"
                          title={t.mrn}
                        >
                          {t.mrn}
                        </p>
                        <Link
                          href={`/celador/transfer/${t.id}`}
                          className="inline-flex items-center min-h-11 -ml-1 px-1 text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline shrink-0 rounded-lg active:bg-blue-50"
                        >
                          Ver ficha
                        </Link>
                        <p className="text-sm text-gray-700 leading-snug">
                          {t.location}
                          <span className="text-gray-400 font-normal"> · </span>
                          <span className="text-gray-500 text-xs">
                            {TEST_LABELS[t.testType] ?? t.testType}
                          </span>
                        </p>
                      </div>
                      <div className="shrink-0 flex flex-col items-end gap-2 text-right pt-0.5 pl-1 min-w-[6.5rem]">
                        <ElapsedTime createdAt={t.createdAt} />
                        <Link
                          href={`/celador/transfer/${t.id}`}
                          className="inline-flex items-center justify-end min-h-11 -mr-1 pl-2 text-sm font-medium text-blue-600 hover:text-blue-800 whitespace-nowrap rounded-lg active:bg-blue-50"
                        >
                          Detalle →
                        </Link>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5 pt-1 border-t border-gray-100">
                      <StatusBadge     status={t.status} />
                      <DifficultyBadge difficulty={t.difficulty} />
                      <PriorityBadge   priority={t.priority} />
                    </div>

                    {/* Contexto de estado */}
                    {STATUS_CTX[t.status] && (
                      <p className="text-xs text-gray-500 italic border-t border-gray-50 pt-2">
                        {STATUS_CTX[t.status]}
                      </p>
                    )}
                  </div>

                  {/* Acciones de transporte */}
                  {t.status !== "EN_PRUEBA" && (
                    <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 rounded-b-xl flex flex-wrap gap-2">
                      {/* Firma */}
                      {t.status === "ASIGNADO" && t.requiresAcceptance && (
                        <button type="button" disabled={disabled} onClick={() => setOpenSig(t.id)} className={BTN}>
                          ✍ Firmar responsable
                        </button>
                      )}

                      {/* Pausar / Reanudar */}
                      {t.status !== "PAUSADO" ? (
                        <button type="button" disabled={disabled} onClick={() => run(t.id, pauseTransfer)} className={BTN}>
                          ⏸ Pausar
                        </button>
                      ) : (
                        <button type="button" disabled={disabled} onClick={() => run(t.id, resumeTransfer)} className={BTN}>
                          ▶ Reanudar
                        </button>
                      )}

                      {(t.status === "ASIGNADO" ||
                        t.status === "EN_CURSO" ||
                        t.status === "PAUSADO") && (
                        <button
                          disabled={disabled}
                          type="button"
                          onClick={() => {
                            if (
                              !confirm(
                                "¿Liberar este traslado? Volverá a la cola para que otro celador lo asigne (p. ej. fin de turno). Si requería firma, habrá que firmar de nuevo."
                              )
                            ) {
                              return;
                            }
                            void run(t.id, releaseTransferToPool);
                          }}
                          className={`${BTN} border-amber-200 text-amber-900 hover:bg-amber-50`}
                        >
                          ↩ Liberar a la cola
                        </button>
                      )}

                      {disabled && <LoadingInline label="Actualizando..." />}
                    </div>
                  )}

                  {/* EN_PRUEBA — el celador finaliza el traslado */}
                  {t.status === "EN_PRUEBA" && (
                    <div className="px-4 py-3 border-t border-violet-100 bg-violet-50 rounded-b-xl space-y-2">
                      <p className="text-sm text-violet-800 font-medium leading-snug">
                        🔬 Técnico realizando la prueba — confirma cuando haya terminado
                      </p>
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => run(t.id, setStatus, (fd) => fd.set("next", "FINALIZADO"))}
                        className="w-full min-h-12 bg-green-600 text-white text-base font-medium rounded-lg py-3 hover:bg-green-700 disabled:opacity-40 transition-colors"
                      >
                        {disabled ? "Finalizando…" : "✓ Finalizar traslado"}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* MODAL FIRMA */}
      <SignatureModal
        open={!!openSig}
        onClose={() => setOpenSig(null)}
        onConfirm={async (data) => {
          if (!openSig) return;
          setPendingId(openSig);
          const fd = new FormData();
          fd.set("transferId", openSig);
          fd.set("signerName",  data.signerName);
          if (data.signerRole) fd.set("signerRole", data.signerRole);
          fd.set("signatureData", data.signatureData);
          try {
            await acceptTransfer(fd);
            setOpenSig(null);
            requestCeladorTransfersRefresh();
          } catch (e) {
            console.error(e);
            showClientToast(getUserActionErrorMessage(e), "error");
          } finally {
            setPendingId(null);
          }
        }}
      />
    </>
  );
}
