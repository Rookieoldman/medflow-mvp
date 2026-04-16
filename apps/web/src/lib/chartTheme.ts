import type { CSSProperties } from "react";

/**
 * Estilos compartidos para gráficos Recharts (admin / estadísticas).
 */
export const chartTooltipProps = {
  contentStyle: {
    borderRadius: 12,
    border: "1px solid rgb(231 229 228)",
    boxShadow: "0 12px 40px -12px rgb(15 23 42 / 0.18)",
    padding: "10px 14px",
    backgroundColor: "rgba(255,255,255,0.97)",
  },
  labelStyle: {
    fontWeight: 600,
    marginBottom: 6,
    color: "#1c1917",
    fontSize: 12,
  },
  itemStyle: { fontSize: 12, color: "#57534e" },
} as const;

export const chartLegendWrapperStyle: CSSProperties = {
  paddingTop: 16,
  fontSize: 12,
};

export const chartAxisTick = { fill: "#78716c", fontSize: 11 };
