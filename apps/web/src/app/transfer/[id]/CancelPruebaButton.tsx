"use client";

import { useRef } from "react";

export default function CancelPruebaButton({
  transferId,
  action,
}: {
  transferId: string;
  action: (formData: FormData) => Promise<void>;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={action} className="space-y-2">
      <input type="hidden" name="transferId" value={transferId} />

      {/* opcional: nota */}
      <input
        name="note"
        placeholder="Motivo (opcional)"
        className="border p-2 w-full max-w-md"
      />

      <button
        type="button"
        className="bg-red-600 text-white px-4 py-2"
        onClick={() => {
          const ok = window.confirm(
            "¿Confirmas que quieres cancelar la prueba? Esto registrará una incidencia y finalizará el traslado."
          );
          if (ok) formRef.current?.requestSubmit();
        }}
      >
        Cancelar prueba
      </button>
    </form>
  );
}