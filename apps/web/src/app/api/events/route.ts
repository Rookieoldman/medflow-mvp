import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { eventBus, MedflowEvent } from "@/lib/eventBus";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new Response("No autorizado", { status: 401 });
  }

  const userId = (session.user as any).id as string;
  const role   = (session.user as any).role as string;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      function send(data: object) {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          // cliente desconectado
        }
      }

      // Ping inicial para confirmar conexión
      send({ type: "connected", userId, role });

      function onEvent(event: MedflowEvent) {
        // Filtrar: solo enviar eventos relevantes para este usuario
        const isAdmin   = role === "ADMIN";
        const isCelador = role === "CELADOR" && (
          event.celadorId === userId || event.type === "transfer:new"
        );
        const isTecnico = role === "TECNICO" && event.tecnicoId === userId;

        if (isAdmin || isCelador || isTecnico) {
          send(event);
        }
      }

      eventBus.on("medflow", onEvent);

      // Heartbeat cada 25 s para mantener la conexión viva
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": heartbeat\n\n"));
        } catch {
          clearInterval(heartbeat);
        }
      }, 25_000);

      // Limpiar al cerrar
      req.signal.addEventListener("abort", () => {
        eventBus.off("medflow", onEvent);
        clearInterval(heartbeat);
        try { controller.close(); } catch { /* ya cerrado */ }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type":  "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection":    "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
