interface EmptyStateProps {
  title:    string;
  subtitle?: string;
  icon?:    string;
}

export function EmptyState({ title, subtitle, icon = "📭" }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center border border-gray-200 rounded-xl bg-white">
      <span className="text-4xl mb-3">{icon}</span>
      <p className="font-medium text-gray-700">{title}</p>
      {subtitle && (
        <p className="text-sm text-gray-400 mt-1 max-w-xs">{subtitle}</p>
      )}
    </div>
  );
}
