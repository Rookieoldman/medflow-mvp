import Link from "next/link";

type Props = {
  page:       number;
  totalPages: number;
  total:      number;
  pageSize:   number;
  buildHref:  (page: number) => string;
};

export function Pagination({ page, totalPages, total, pageSize, buildHref }: Props) {
  if (totalPages <= 1) return null;

  const from  = (page - 1) * pageSize + 1;
  const to    = Math.min(page * pageSize, total);

  // Genera el rango de páginas visible: siempre muestra hasta 5 páginas centradas en la actual
  const pages: (number | "…")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3)           pages.push("…");
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
    if (page < totalPages - 2) pages.push("…");
    pages.push(totalPages);
  }

  const btnBase = "h-8 min-w-[2rem] px-2 rounded-lg text-sm flex items-center justify-center transition-colors";
  const btnActive = `${btnBase} bg-gray-900 text-white font-medium`;
  const btnInactive = `${btnBase} border border-gray-200 text-gray-600 hover:bg-gray-50`;
  const btnDisabled = `${btnBase} border border-gray-100 text-gray-300 cursor-not-allowed`;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
      <p className="text-xs text-gray-400">
        Mostrando <span className="font-medium text-gray-600">{from}–{to}</span> de{" "}
        <span className="font-medium text-gray-600">{total}</span> resultado{total !== 1 ? "s" : ""}
      </p>

      <nav className="flex items-center gap-1">
        {page > 1 ? (
          <Link href={buildHref(page - 1)} className={btnInactive}>‹</Link>
        ) : (
          <span className={btnDisabled}>‹</span>
        )}

        {pages.map((p, i) =>
          p === "…" ? (
            <span key={`ellipsis-${i}`} className="h-8 px-1 flex items-center text-gray-400 text-sm">…</span>
          ) : p === page ? (
            <span key={p} className={btnActive}>{p}</span>
          ) : (
            <Link key={p} href={buildHref(p)} className={btnInactive}>{p}</Link>
          )
        )}

        {page < totalPages ? (
          <Link href={buildHref(page + 1)} className={btnInactive}>›</Link>
        ) : (
          <span className={btnDisabled}>›</span>
        )}
      </nav>
    </div>
  );
}
