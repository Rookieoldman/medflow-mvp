import { describe, expect, it } from "vitest";
import { celadorMayViewTransferDetail } from "./celadorTransferAccess";

describe("celadorMayViewTransferDetail", () => {
  const me = "celador-1";

  it("permite si soy el asignado (incluso FINALIZADO)", () => {
    expect(
      celadorMayViewTransferDetail(
        { assignedToId: me, status: "FINALIZADO" },
        me
      )
    ).toBe(true);
  });

  it("rechaza otro asignado", () => {
    expect(
      celadorMayViewTransferDetail(
        { assignedToId: "otro", status: "EN_CURSO" },
        me
      )
    ).toBe(false);
  });

  it("permite cola pública con estados de cola", () => {
    for (const status of ["SOLICITADO", "ASIGNADO", "EN_CURSO", "PAUSADO"] as const) {
      expect(
        celadorMayViewTransferDetail({ assignedToId: null, status }, me)
      ).toBe(true);
    }
  });

  it("rechaza EN_PRUEBA sin asignar en ficha pública", () => {
    expect(
      celadorMayViewTransferDetail({ assignedToId: null, status: "EN_PRUEBA" }, me)
    ).toBe(false);
  });

  it("rechaza FINALIZADO sin asignar", () => {
    expect(
      celadorMayViewTransferDetail({ assignedToId: null, status: "FINALIZADO" }, me)
    ).toBe(false);
  });
});
