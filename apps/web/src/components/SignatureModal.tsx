"use client";

import { useRef, useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: (data: {
    signerName: string;
    signerRole?: string;
    signatureData: string;
  }) => void;
};

export default function SignatureModal({
  open,
  onClose,
  onConfirm,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);

  const [signerName, setSignerName] = useState("");
  const [signerRole, setSignerRole] = useState("");

  if (!open) return null;

  function startDraw(e: React.MouseEvent<HTMLCanvasElement>) {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;

    drawing.current = true;
    ctx.beginPath();
    ctx.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
  }

  function draw(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;

    ctx.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
    ctx.stroke();
  }

  function endDraw() {
    drawing.current = false;
  }

  function clearCanvas() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  function handleConfirm() {
    if (!signerName.trim()) {
      alert("El nombre del responsable es obligatorio");
      return;
    }

    const signatureData =
      canvasRef.current?.toDataURL("image/png") ?? "";

    onConfirm({
      signerName,
      signerRole: signerRole || undefined,
      signatureData,
    });

    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded shadow-lg w-full max-w-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold">
          Aceptar traslado (firma)
        </h2>

        <div className="space-y-2">
          <input
            className="border p-2 w-full"
            placeholder="Nombre del responsable"
            value={signerName}
            onChange={(e) => setSignerName(e.target.value)}
          />

          <input
            className="border p-2 w-full"
            placeholder="Rol / Unidad (opcional)"
            value={signerRole}
            onChange={(e) => setSignerRole(e.target.value)}
          />
        </div>

        <div>
          <p className="text-sm text-gray-600 mb-1">Firma:</p>
          <canvas
            ref={canvasRef}
            width={400}
            height={150}
            className="border w-full cursor-crosshair"
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={endDraw}
            onMouseLeave={endDraw}
          />
        </div>

        <div className="flex justify-between gap-2">
          <button
            className="border px-3 py-2 text-sm"
            onClick={clearCanvas}
          >
            Limpiar firma
          </button>

          <div className="flex gap-2">
            <button
              className="border px-3 py-2 text-sm"
              onClick={onClose}
            >
              Cancelar
            </button>

            <button
              className="bg-blue-600 text-white px-4 py-2 text-sm"
              onClick={handleConfirm}
            >
              Confirmar aceptación
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}