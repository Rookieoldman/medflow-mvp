"use client";

export type ClientToastType = "info" | "success" | "warning" | "error";

const EVENT = "medflow-client-toast";

export type ClientToastDetail = { message: string; type: ClientToastType };

/** Muestra un toast global (el componente Toaster escucha este evento). */
export function showClientToast(
  message: string,
  type: ClientToastType = "warning"
): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<ClientToastDetail>(EVENT, {
      detail: { message, type },
    })
  );
}

export const CLIENT_TOAST_EVENT = EVENT;

export function getUserActionErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  if (typeof error === "string" && error.trim()) {
    return error;
  }
  return "Ha ocurrido un error. Inténtalo de nuevo.";
}

export const CELADOR_REFRESH_EVENT = "medflow-celador-refresh";

/** Pide a CeladorClient que vuelva a cargar disponibles / mis traslados. */
export function requestCeladorTransfersRefresh(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CELADOR_REFRESH_EVENT));
}
