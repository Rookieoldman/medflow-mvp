import { describe, expect, it } from "vitest";
import {
  assignFromQueuePrecheck,
  createIncidentPrecheck,
  pauseTransferPrecheck,
} from "./celadorActionGuards";

describe("assignFromQueuePrecheck", () => {
  it("permite SOLICITADO sin asignar", () => {
    expect(
      assignFromQueuePrecheck({
        assignedToId: null,
        status:       "SOLICITADO",
      }).ok
    ).toBe(true);
  });

  it("rechaza si ya hay celador", () => {
    const r = assignFromQueuePrecheck({
      assignedToId: "u1",
      status:       "SOLICITADO",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toContain("asignado");
  });

  it("rechaza FINALIZADO, CANCELADO, EN_PRUEBA", () => {
    for (const status of ["FINALIZADO", "CANCELADO", "EN_PRUEBA"] as const) {
      const r = assignFromQueuePrecheck({ assignedToId: null, status });
      expect(r.ok).toBe(false);
    }
  });
});

describe("pauseTransferPrecheck", () => {
  it("permite EN_CURSO", () => {
    expect(pauseTransferPrecheck("EN_CURSO").ok).toBe(true);
  });

  it("rechaza ASIGNADO", () => {
    const r = pauseTransferPrecheck("ASIGNADO");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toContain("en curso");
  });

  it("rechaza PAUSADO", () => {
    const r = pauseTransferPrecheck("PAUSADO");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toContain("pausado");
  });
});

describe("createIncidentPrecheck", () => {
  const celador = "c1";

  it("permite asignado a mí y activo", () => {
    expect(
      createIncidentPrecheck(
        { assignedToId: celador, status: "EN_CURSO" },
        celador
      ).ok
    ).toBe(true);
  });

  it("rechaza sin asignación", () => {
    const r = createIncidentPrecheck(
      { assignedToId: null, status: "EN_CURSO" },
      celador
    );
    expect(r.ok).toBe(false);
  });

  it("rechaza otro celador", () => {
    const r = createIncidentPrecheck(
      { assignedToId: "otro", status: "EN_CURSO" },
      celador
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toContain("otro");
  });

  it("rechaza cerrados", () => {
    for (const status of ["FINALIZADO", "CANCELADO"] as const) {
      expect(
        createIncidentPrecheck(
          { assignedToId: celador, status },
          celador
        ).ok
      ).toBe(false);
    }
  });
});
