export default function LoadingInline({
  label = "Actualizando",
}: {
  label?: string;
}) {
  return (
    <span className="flex items-center gap-2 text-sm text-gray-500">
      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
      {label}
    </span>
  );
}