export function PriorityBadge({ priority }: { priority: string }) {
  if (priority !== "URGENTE") return null;

  return (
    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold bg-red-100 text-red-800 border border-red-300">
      URGENTE
    </span>
  );
}