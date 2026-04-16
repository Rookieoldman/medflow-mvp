import { describe, expect, it } from "vitest";
import { buildDailyShiftChartData } from "./statsDailyByShift";

describe("buildDailyShiftChartData", () => {
  it("agrupa por día y turno según hora de updatedAt", () => {
    const base = new Date("2025-06-15T12:00:00"); // domingo mediodía → mañana
    const fin = [{ updatedAt: base }];
    const rows = buildDailyShiftChartData(fin, new Date("2025-06-01"), new Date("2025-06-15T23:59:59"));
    const hit = rows.find((r) => r.dayKey === "2025-06-15");
    expect(hit).toBeDefined();
    expect(hit!.MANANA).toBe(1);
    expect(hit!.TARDE).toBe(0);
    expect(hit!.NOCHE).toBe(0);
    expect(hit!.total).toBe(1);
  });

  it("tarde 16h cuenta como TARDE", () => {
    const fin = [{ updatedAt: new Date("2025-06-10T16:00:00") }];
    const rows = buildDailyShiftChartData(fin, new Date("2025-06-01"), new Date("2025-06-10T20:00:00"));
    const hit = rows.find((r) => r.dayKey === "2025-06-10");
    expect(hit?.TARDE).toBe(1);
    expect(hit?.MANANA).toBe(0);
  });
});
