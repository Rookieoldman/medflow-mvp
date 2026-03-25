"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  assignToMe,
  setStatus,
  pauseTransfer,
  resumeTransfer,
  acceptTransfer,
} from "./serverActions";

import SignatureModal  from "@/components/SignatureModal";
import { PriorityBadge }   from "@/components/PriorityBadge";
import { DifficultyBadge } from "@/components/DifficultyBadge";
import { StatusBadge }     from "@/components/StatusBadge";
import { EmptyState }      from "@/components/ui";
import LoadingInline from "@/components/LoadingInline";
import ElapsedTime   from "@/components/ElapsedTime";

type Transfer = {
  id:                string;
  mrn:               string;
  patientFullName:   string;
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

const STATUS_CTX: Record<string, string> = {
  ASIGNADO:  "Pendiente de firma del responsable",
  EN_CURSO:  "Traslado en curso",
  PAUSADO:   "Traslado pausado",
  EN_PRUEBA: "Paciente en la sala — esperando al técnico",
};

const BTN = "border border-gray-200 rounded-lg px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed";

export default function CeladorClient() {
  const [available, setAvailable] = useState<Transfer[]>([]);
  const [mine,      setMine]      = useState<Transfer[]>([]);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [openSig,   setOpenSig]   = useState<string | null>(null);

  useEffect(() => {
    const fetch_ = async () => {
      const res = await fetch("/api/celador/transfers");
      if (!res.ok) return;
      const data = await res.json();
      setAvailable(data.available ?? []);
      setMine(data.mine ?? []);
      if (pendingId) {
        const exists =
          data.available?.some((t: Transfer) => t.id === pendingId) ||
          data.mine?.some((t: Transfer) => t.id === pendingId);
        if (!exists) setPendingId(null);
      }
    };
    fetch_();
    const t = setInterval(fetch_, 5000);
    return () => clearInterval(t);
  }, [pendingId]);

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
    try { await action(fd); } catch (e) { console.error(e); setPendingId(null); }
    setTimeout(() => setPendingId(null), 2000);
  };

  return (
    <>
      {/* ════════════════════════════════════════
          DISPONIBLES — tarjetas tipo "solicitud"
      ════════════════════════════════════════ */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold text-gray-900">
          Disponibles
          {available.length > 0 && (
            <span className="ml-2 text-sm font-normal text-gray-400">· {available.length}</span>
          )}
        </h2>

        {available.length === 0 ? (
          <EmptyState title="Sin solicitudes disponibles" subtitle="Se actualizará automáticamente" icon="⏳" />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {available.map((t) => (
              <div
                key={t.id}
                className={`border-l-4 ${DIFFICULTY_BORDER[t.difficulty] ?? "border-l-gray-300"} border border-gray-200 rounded-xl bg-white shadow-sm flex flex-col`}
              >
                {/* Cuerpo de la tarjeta */}
                <div className="p-4 flex-1 space-y-3">
                  {/* Fila superior */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs text-gray-400">{t.mrn}</span>
                    <ElapsedTime createdAt={t.createdAt} />
                  </div>

                  {/* Ubicación — lo más importante para el celador */}
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">Origen</p>
                    <p className="font-semibold text-gray-900 text-sm sm:text-base">{t.location}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Prueba: {TEST_LABELS[t.testType] ?? t.testType}
                    </p>
                  </div>

                  {/* Paciente (anonimizado) */}
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 text-xs font-bold shrink-0">
                      {t.patientFullName.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()}
                    </div>
                    <p className="text-sm text-gray-700 font-medium truncate">{t.patientFullName}</p>
                  </div>

                  {/* Badges */}
                  <div className="flex flex-wrap gap-1.5">
                    <DifficultyBadge difficulty={t.difficulty} />
                    <PriorityBadge   priority={t.priority} />
                  </div>
                </div>

                {/* CTA */}
                <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 rounded-b-xl">
                  <button
                    disabled={!!pendingId}
                    onClick={() => run(t.id, assignToMe)}
                    className="w-full bg-gray-900 text-white text-sm font-medium rounded-lg py-2.5 hover:bg-gray-700 disabled:opacity-40 transition-colors"
                  >
                    {pendingId === t.id ? "Asignando…" : "Asignarme este traslado"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

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
              const isReadOnly = t.status === "EN_PRUEBA"; // técnico tiene el control

              return (
                <div
                  key={t.id}
                  className={`border-l-4 ${DIFFICULTY_BORDER[t.difficulty] ?? "border-l-gray-300"} border border-gray-200 rounded-xl bg-white shadow-sm`}
                >
                  {/* Info */}
                  <div className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-gray-400">{t.mrn}</span>
                          <ElapsedTime createdAt={t.createdAt} />
                        </div>
                        <p className="font-semibold text-gray-900 text-sm truncate">{t.patientFullName}</p>
                        <p className="text-xs text-gray-500">{t.location} · {TEST_LABELS[t.testType] ?? t.testType}</p>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          <StatusBadge     status={t.status} />
                          <DifficultyBadge difficulty={t.difficulty} />
                          <PriorityBadge   priority={t.priority} />
                        </div>
                      </div>
                      <Link
                        href={`/celador/transfer/${t.id}`}
                        className="text-xs font-medium text-blue-600 hover:text-blue-800 shrink-0 self-start pt-0.5"
                      >
                        Detalle →
                      </Link>
                    </div>

                    {/* Contexto de estado */}
                    {STATUS_CTX[t.status] && (
                      <p className="text-xs text-gray-500 italic border-t border-gray-50 pt-2">
                        {STATUS_CTX[t.status]}
                      </p>
                    )}
                  </div>

                  {/* Acciones de transporte — solo si no está en manos del técnico */}
                  {!isReadOnly && (
                    <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 rounded-b-xl flex flex-wrap gap-2">
                      {/* Firma */}
                      {t.status === "ASIGNADO" && t.requiresAcceptance && (
                        <button disabled={disabled} onClick={() => setOpenSig(t.id)} className={BTN}>
                          ✍ Firmar responsable
                        </button>
                      )}

                      {/* Pausar / Reanudar */}
                      {t.status !== "PAUSADO" ? (
                        <button disabled={disabled} onClick={() => run(t.id, pauseTransfer)} className={BTN}>
                          ⏸ Pausar
                        </button>
                      ) : (
                        <button disabled={disabled} onClick={() => run(t.id, resumeTransfer)} className={BTN}>
                          ▶ Reanudar
                        </button>
                      )}

                      {disabled && <LoadingInline label="Actualizando..." />}
                    </div>
                  )}

                  {/* EN_PRUEBA — aviso de que el técnico tiene el control */}
                  {isReadOnly && (
                    <div className="px-4 py-3 border-t border-violet-100 bg-violet-50 rounded-b-xl">
                      <p className="text-xs text-violet-700 font-medium">
                        🔬 El técnico está realizando la prueba — sin acciones disponibles
                      </p>
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
          await acceptTransfer(fd);
          setOpenSig(null);
          setTimeout(() => setPendingId(null), 1500);
        }}
      />
    </>
  );
}
