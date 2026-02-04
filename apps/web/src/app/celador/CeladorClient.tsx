"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import LoadingInline from "@/components/LoadingInline";

import {
  assignToMe,
  setStatus,
  pauseTransfer,
  resumeTransfer,
  acceptTransfer,
} from "./serverActions";

import SignatureModal from "@/components/SignatureModal";
import { StatusBadge } from "@/components/StatusBadge";
import { PriorityBadge } from "@/components/PriorityBadge";
import { initials } from "@/lib/patient";
import ElapsedTime from "@/components/ElapsedTime";

type Transfer = {
  id: string;
  mrn: string;
  patientFullName: string;
  location: string;
  testType: string;
  priority: string;
  status: string;
  createdAt: string;
  acceptance?: unknown;
};

export default function CeladorClient() {
  const [available, setAvailable] = useState<Transfer[]>([]);
  const [mine, setMine] = useState<Transfer[]>([]);
  const [openSignature, setOpenSignature] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  // ===========================
  // POLLING
  // ===========================
  useEffect(() => {
    let timer: NodeJS.Timeout;

    const fetchTransfers = async () => {
      const res = await fetch("/api/celador/transfers");
      if (!res.ok) return;

      const data = await res.json();
      setAvailable(data.available ?? []);
      setMine(data.mine ?? []);

      // 🔓 liberar bloqueo si ya no existe o cambió
      if (pendingId) {
        const stillExists =
          data.available?.some((t: Transfer) => t.id === pendingId) ||
          data.mine?.some((t: Transfer) => t.id === pendingId);

        if (!stillExists) {
          setPendingId(null);
        }
      }
    };

    fetchTransfers();
    timer = setInterval(fetchTransfers, 5000);

    return () => clearInterval(timer);
  }, [pendingId]);

  // ===========================
  // HELPERS
  // ===========================
  const runAction = async (
    transferId: string,
    action: (fd: FormData) => Promise<void>,
    buildFormData?: (fd: FormData) => void
  ) => {
    if (pendingId) return;

    setPendingId(transferId);

    const fd = new FormData();
    fd.set("transferId", transferId);
    buildFormData?.(fd);

    try {
      await action(fd);
    } catch (e) {
      console.error(e);
      setPendingId(null);
    }

    // ⏱️ desbloqueo defensivo
    setTimeout(() => {
      setPendingId(null);
    }, 2000);
  };

  // ===========================
  // RENDER
  // ===========================
  return (
    <>
      {/* ===========================
          TRASLADOS DISPONIBLES
      ============================ */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Traslados disponibles</h2>

        {available.length === 0 ? (
          <p className="text-sm text-gray-600">No hay traslados disponibles.</p>
        ) : (
          <div className="space-y-3">
            {available.map((t) => (
              <div
                key={t.id}
                className="relative border rounded p-4 flex items-center justify-between"
              >
                <div className="absolute top-2 right-2">
                  <ElapsedTime createdAt={t.createdAt} />
                </div>

                <div className="space-y-1">
                  <div className="font-mono text-sm">{t.mrn}</div>
                  <div className="text-2xl font-semibold">
                    {initials(t.patientFullName)}
                  </div>
                  <div className="text-sm text-gray-600">
                    {t.location} → {t.testType}
                  </div>
                  <div className="flex gap-2">
                    <PriorityBadge priority={t.priority} />
                    <StatusBadge status={t.status} />
                  </div>
                </div>

                <button
                  disabled={pendingId === t.id}
                  onClick={() => runAction(t.id, assignToMe)}
                  className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
                >
                  Asignarme
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ===========================
          MIS TRASLADOS
      ============================ */}
      <section className="space-y-4 mt-10">
        <h2 className="text-lg font-semibold">Mis traslados</h2>

        {mine.length === 0 ? (
          <p className="text-sm text-gray-600">No tienes traslados activos.</p>
        ) : (
          <div className="space-y-4">
            {mine.map((t) => {
              const disabled = pendingId === t.id;

              return (
                <div
                  key={t.id}
                  className="relative border rounded p-4 space-y-4"
                >
                  <div className="absolute top-2 right-2">
                    <ElapsedTime createdAt={t.createdAt} />
                  </div>

                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="font-mono text-sm">{t.mrn}</div>
                      <div className="text-2xl font-semibold">
                        {initials(t.patientFullName)}
                      </div>
                      <div className="text-sm text-gray-600">
                        {t.location} → {t.testType}
                      </div>
                      <div className="flex gap-2">
                        <PriorityBadge priority={t.priority} />
                        <StatusBadge status={t.status} />
                      </div>
                    </div>

                    <Link
                      href={`/celador/transfer/${t.id}`}
                      className="underline text-sm self-end"
                    >
                      Ver
                    </Link>
                  </div>

                  {/* BOTONES */}
                  <div className="flex flex-wrap gap-2">
                    {t.status === "ASIGNADO" && (
                      <button
                        disabled={disabled}
                        onClick={() => setOpenSignature(t.id)}
                        className="border px-3 py-2 rounded disabled:opacity-50"
                      >
                        Aceptar traslado (firma)
                      </button>
                    )}

                    {t.status === "EN_CURSO" && (
                      <button
                        disabled={disabled}
                        onClick={() =>
                          runAction(t.id, setStatus, (fd) =>
                            fd.set("next", "EN_CAMINO_PRUEBA")
                          )
                        }
                        className="border px-3 py-2 rounded disabled:opacity-50"
                      >
                        En camino a prueba
                      </button>
                    )}

                    {t.status === "EN_CAMINO_PRUEBA" && (
                      <>
                        <button
                          disabled={disabled}
                          onClick={() =>
                            runAction(t.id, setStatus, (fd) =>
                              fd.set("next", "EN_ESPERA")
                            )
                          }
                          className="border px-3 py-2 rounded disabled:opacity-50"
                        >
                          En espera
                        </button>

                        <button
                          disabled={disabled}
                          onClick={() =>
                            runAction(t.id, setStatus, (fd) =>
                              fd.set("next", "EN_LA_PRUEBA")
                            )
                          }
                          className="border px-3 py-2 rounded disabled:opacity-50"
                        >
                          En la prueba
                        </button>
                      </>
                    )}

                    {t.status === "EN_ESPERA" && (
                      <button
                        disabled={disabled}
                        onClick={() =>
                          runAction(t.id, setStatus, (fd) =>
                            fd.set("next", "EN_LA_PRUEBA")
                          )
                        }
                        className="border px-3 py-2 rounded disabled:opacity-50"
                      >
                        En la prueba
                      </button>
                    )}

                    {t.status === "EN_LA_PRUEBA" && (
                      <button
                        disabled={disabled}
                        onClick={() =>
                          runAction(t.id, setStatus, (fd) =>
                            fd.set("next", "VUELTA")
                          )
                        }
                        className="border px-3 py-2 rounded disabled:opacity-50"
                      >
                        Iniciar vuelta
                      </button>
                    )}

                    {t.status === "VUELTA" && (
                      <button
                        disabled={disabled}
                        onClick={() =>
                          runAction(t.id, setStatus, (fd) =>
                            fd.set("next", "FINALIZADO")
                          )
                        }
                        className="border px-3 py-2 rounded disabled:opacity-50"
                      >
                        Finalizar
                      </button>
                    )}

                    {t.status !== "PAUSADO" ? (
                      <button
                        disabled={disabled}
                        onClick={() => runAction(t.id, pauseTransfer)}
                        className="border px-3 py-2 rounded disabled:opacity-50"
                      >
                        Pausar
                      </button>
                    ) : (
                      <button
                        disabled={disabled}
                        onClick={() => runAction(t.id, resumeTransfer)}
                        className="border px-3 py-2 rounded disabled:opacity-50"
                      >
                        Reanudar
                      </button>
                    )}

                    <Link
                      href={`/celador/incidencia/${t.id}`}
                      className="border px-3 py-2 rounded"
                    >
                      Registrar incidencia
                    </Link>

                    {disabled && <LoadingInline label="Actualizando estado" />}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* MODAL FIRMA */}
      <SignatureModal
        open={!!openSignature}
        onClose={() => setOpenSignature(null)}
        onConfirm={async (data) => {
          if (!openSignature) return;

          setPendingId(openSignature);

          const fd = new FormData();
          fd.set("transferId", openSignature);
          fd.set("signerName", data.signerName);
          if (data.signerRole) fd.set("signerRole", data.signerRole);
          fd.set("signatureData", data.signatureData);

          await acceptTransfer(fd);
          setOpenSignature(null);

          setTimeout(() => setPendingId(null), 1500);
        }}
      />
    </>
  );
}