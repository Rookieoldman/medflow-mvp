"use client";

import Link from "next/link";
import { useState } from "react";

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

type Props = {
  available?: Transfer[];
  mine?: Transfer[];
};

export default function CeladorClient({ available = [], mine = [] }: Props) {
  const [openSignature, setOpenSignature] = useState<string | null>(null);

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
                {/* ⏱️ TIMER */}
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

                <form action={assignToMe}>
                  <input type="hidden" name="transferId" value={t.id} />
                  <button
                    type="submit"
                    className="bg-blue-600 text-white px-4 py-2"
                  >
                    Asignarme
                  </button>
                </form>
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
            {mine.map((t) => (
              <div key={t.id} className="relative border rounded p-4 space-y-4">
                {/* ⏱️ TIMER */}
                <div className="absolute top-2 right-2">
                  <ElapsedTime createdAt={t.createdAt} />
                </div>

                {/* INFO */}
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

                    {t.acceptance && (
                      <div className="text-xs text-green-600 font-medium">
                        ✔ Traslado aceptado por responsable
                      </div>
                    )}
                  </div>

                  <Link
                    href={`/celador/transfer/${t.id}`}
                    className="underline text-sm self-end"
                  >
                    Ver
                  </Link>
                </div>

                {/* ===========================
                    BOTONES DE FLUJO
                ============================ */}
                <div className="flex flex-wrap gap-2">
                  {/* ASIGNADO → FIRMA */}
                  {t.status === "ASIGNADO" && (
                    <button
                      className="border px-3 py-2"
                      onClick={() => setOpenSignature(t.id)}
                    >
                      Aceptar traslado (firma)
                    </button>
                  )}

                  {/* EN_CURSO */}
                  {t.status === "EN_CURSO" && (
                    <form action={setStatus}>
                      <input type="hidden" name="transferId" value={t.id} />
                      <input
                        type="hidden"
                        name="next"
                        value="EN_CAMINO_PRUEBA"
                      />
                      <button className="border px-3 py-2" type="submit">
                        En camino a prueba
                      </button>
                    </form>
                  )}

                  {/* EN_CAMINO_PRUEBA */}
                  {t.status === "EN_CAMINO_PRUEBA" && (
                    <>
                      <form action={setStatus}>
                        <input type="hidden" name="transferId" value={t.id} />
                        <input type="hidden" name="next" value="EN_ESPERA" />
                        <button className="border px-3 py-2">En espera</button>
                      </form>

                      <form action={setStatus}>
                        <input type="hidden" name="transferId" value={t.id} />
                        <input type="hidden" name="next" value="EN_LA_PRUEBA" />
                        <button className="border px-3 py-2">
                          En la prueba
                        </button>
                      </form>
                    </>
                  )}

                  {/* EN_ESPERA */}
                  {t.status === "EN_ESPERA" && (
                    <form action={setStatus}>
                      <input type="hidden" name="transferId" value={t.id} />
                      <input type="hidden" name="next" value="EN_LA_PRUEBA" />
                      <button className="border px-3 py-2">En la prueba</button>
                    </form>
                  )}

                  {/* EN_LA_PRUEBA */}
                  {t.status === "EN_LA_PRUEBA" && (
                    <form action={setStatus}>
                      <input type="hidden" name="transferId" value={t.id} />
                      <input type="hidden" name="next" value="VUELTA" />
                      <button className="border px-3 py-2">
                        Iniciar vuelta
                      </button>
                    </form>
                  )}

                  {/* VUELTA */}
                  {t.status === "VUELTA" && (
                    <form action={setStatus}>
                      <input type="hidden" name="transferId" value={t.id} />
                      <input type="hidden" name="next" value="FINALIZADO" />
                      <button className="border px-3 py-2">Finalizar</button>
                    </form>
                  )}

                  {/* PAUSAR / REANUDAR */}
                  {t.status !== "PAUSADO" ? (
                    <form action={pauseTransfer}>
                      <input type="hidden" name="transferId" value={t.id} />
                      <button className="border px-3 py-2">Pausar</button>
                    </form>
                  ) : (
                    <form action={resumeTransfer}>
                      <input type="hidden" name="transferId" value={t.id} />
                      <button className="border px-3 py-2">Reanudar</button>
                    </form>
                  )}
                  <Link
                    className="border px-3 py-2"
                    href={`/celador/incidencia/${t.id}`}
                  >
                    Registrar incidencia
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ===========================
          MODAL DE FIRMA
      ============================ */}
      <SignatureModal
        open={!!openSignature}
        onClose={() => setOpenSignature(null)}
        onConfirm={async (data) => {
          if (!openSignature) return;

          const fd = new FormData();
          fd.set("transferId", openSignature);
          fd.set("signerName", data.signerName);
          if (data.signerRole) fd.set("signerRole", data.signerRole);
          fd.set("signatureData", data.signatureData);

          await acceptTransfer(fd);
          setOpenSignature(null);
        }}
      />
    </>
  );
}
