import { EventEmitter } from "events";

export type MedflowEventType =
  | "transfer:new"
  | "transfer:assigned"
  | "transfer:status";

export interface MedflowEvent {
  type:        MedflowEventType;
  transferId:  string;
  status?:     string;
  /** ID del celador destinatario (para filtrar en el SSE) */
  celadorId?:  string;
  /** ID del técnico destinatario */
  tecnicoId?:  string;
  patientName?: string;
  mrn?:        string;
  location?:   string;
}

declare global {
  // eslint-disable-next-line no-var
  var __medflowEventBus: EventEmitter | undefined;
}

// Singleton que sobrevive hot-reloads de Next.js en desarrollo
if (!globalThis.__medflowEventBus) {
  const bus = new EventEmitter();
  bus.setMaxListeners(200);
  globalThis.__medflowEventBus = bus;
}

export const eventBus = globalThis.__medflowEventBus!;

export function emitTransferEvent(event: MedflowEvent) {
  eventBus.emit("medflow", event);
}
