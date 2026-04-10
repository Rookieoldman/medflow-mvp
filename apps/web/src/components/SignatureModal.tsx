"use client";

import { useRef, useState, useEffect } from "react";

type Props = {
  open:      boolean;
  onClose:   () => void;
  onConfirm: (data: { signerName: string; signerRole?: string; signatureData: string }) => void;
};

const INPUT = "border border-gray-200 rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:ring-2 focus:ring-gray-300";

export default function SignatureModal({ open, onClose, onConfirm }: Props) {
  const canvasRef    = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const drawing      = useRef(false);
  const lastPos      = useRef<{ x: number; y: number } | null>(null);

  const [signerName, setSignerName] = useState("");
  const [signerRole, setSignerRole] = useState("");

  /* Ajustar canvas al ancho del contenedor */
  useEffect(() => {
    if (!open) return;
    const el = containerRef.current;
    const canvas = canvasRef.current;
    if (!el || !canvas) return;
    canvas.width  = el.clientWidth;
    canvas.height = 140;
  }, [open]);

  if (!open) return null;

  /* ── Mouse ── */
  function getPos(e: React.MouseEvent<HTMLCanvasElement>) {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  function startDraw(e: React.MouseEvent<HTMLCanvasElement>) {
    drawing.current = true;
    lastPos.current = getPos(e);
  }
  function draw(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!drawing.current || !lastPos.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = "#111827";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.stroke();
    lastPos.current = pos;
  }
  function endDraw() { drawing.current = false; lastPos.current = null; }

  /* ── Touch ── */
  function getTouchPos(e: React.TouchEvent<HTMLCanvasElement>) {
    const r = canvasRef.current!.getBoundingClientRect();
    const t = e.touches[0];
    return { x: t.clientX - r.left, y: t.clientY - r.top };
  }
  function touchStart(e: React.TouchEvent<HTMLCanvasElement>) {
    e.preventDefault();
    drawing.current = true;
    lastPos.current = getTouchPos(e);
  }
  function touchMove(e: React.TouchEvent<HTMLCanvasElement>) {
    e.preventDefault();
    if (!drawing.current || !lastPos.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const pos = getTouchPos(e);
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = "#111827";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.stroke();
    lastPos.current = pos;
  }

  function clearCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
  }

  function handleConfirm() {
    if (!signerName.trim()) { alert("El nombre del responsable es obligatorio"); return; }
    onConfirm({
      signerName,
      signerRole: signerRole || undefined,
      signatureData: canvasRef.current?.toDataURL("image/png") ?? "",
    });
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4 pt-[env(safe-area-inset-top)]"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-white w-full max-h-[min(90dvh,calc(100dvh-env(safe-area-inset-bottom)-1rem))] overflow-y-auto overscroll-contain sm:max-w-lg sm:rounded-xl shadow-xl space-y-4 p-5 rounded-t-2xl pb-[max(1.25rem,env(safe-area-inset-bottom))]"
      >
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-gray-900">Firma del responsable</h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center text-gray-400 hover:text-gray-700 text-lg leading-none rounded-lg hover:bg-gray-100"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        <div className="space-y-2.5">
          <input
            className={INPUT}
            placeholder="Nombre del responsable *"
            value={signerName}
            onChange={(e) => setSignerName(e.target.value)}
          />
          <input
            className={INPUT}
            placeholder="Rol / Unidad (opcional)"
            value={signerRole}
            onChange={(e) => setSignerRole(e.target.value)}
          />
        </div>

        <div ref={containerRef}>
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Firma</p>
            <button onClick={clearCanvas} className="text-xs text-gray-400 hover:text-gray-700">
              Limpiar
            </button>
          </div>
          <canvas
            ref={canvasRef}
            className="border border-gray-200 rounded-lg w-full cursor-crosshair bg-gray-50 touch-none"
            style={{ height: 140 }}
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={endDraw}
            onMouseLeave={endDraw}
            onTouchStart={touchStart}
            onTouchMove={touchMove}
            onTouchEnd={endDraw}
          />
          <p className="text-xs text-gray-400 mt-1 text-center">Dibuja tu firma en el recuadro</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 pt-1">
          <button
            type="button"
            onClick={handleConfirm}
            className="flex-1 min-h-12 bg-gray-900 text-white rounded-lg px-4 py-3 text-base font-medium hover:bg-gray-700 transition-colors"
          >
            Confirmar aceptación
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 min-h-12 border border-gray-200 rounded-lg px-4 py-3 text-base text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
