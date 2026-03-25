interface KpiProps {
  label:     string;
  value:     string | number;
  sub?:      string;
  highlight?: "red" | "green" | "orange" | "blue" | "default";
  wide?:     boolean;
}

const HIGHLIGHT_CLASSES = {
  default: "text-gray-900",
  red:     "text-red-600",
  green:   "text-green-600",
  orange:  "text-orange-500",
  blue:    "text-blue-600",
};

export function Kpi({ label, value, sub, highlight = "default", wide }: KpiProps) {
  return (
    <div
      className={`border border-gray-200 rounded-xl p-4 bg-white space-y-1 ${wide ? "col-span-2" : ""}`}
    >
      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
        {label}
      </div>
      <div className={`text-2xl font-semibold ${HIGHLIGHT_CLASSES[highlight]}`}>
        {value}
      </div>
      {sub && <div className="text-xs text-gray-400">{sub}</div>}
    </div>
  );
}
