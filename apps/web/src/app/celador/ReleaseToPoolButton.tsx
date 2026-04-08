"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { releaseTransferToPool } from "./serverActions";
import {
  showClientToast,
  getUserActionErrorMessage,
  requestCeladorTransfersRefresh,
} from "@/lib/clientToast";

export function ReleaseToPoolButton({ transferId }: { transferId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (
          !confirm(
            "¿Liberar este traslado? Volverá a la cola para otro celador (p. ej. fin de turno). Si requería firma, habrá que firmar de nuevo."
          )
        ) {
          return;
        }
        startTransition(async () => {
          const fd = new FormData();
          fd.set("transferId", transferId);
          try {
            await releaseTransferToPool(fd);
            router.refresh();
            requestCeladorTransfersRefresh();
          } catch (e) {
            console.error(e);
            showClientToast(getUserActionErrorMessage(e), "error");
          }
        });
      }}
      className="inline-flex items-center gap-2 border rounded-lg px-4 py-2.5 text-sm font-medium text-amber-900 border-amber-200 bg-amber-50 hover:bg-amber-100 transition-colors disabled:opacity-50"
    >
      {pending ? "Liberando…" : "↩ Liberar a la cola (otro celador / turno)"}
    </button>
  );
}
