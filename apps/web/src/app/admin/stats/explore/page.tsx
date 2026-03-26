import { parseStatsScope } from "@/lib/adminStatsPeriod";
import {
  formatDateOnlyLocal,
  isExploreDim,
  isExploreKpi,
} from "@/lib/statsExplore";
import ExploreClient from "./ExploreClient";
import { loadExploreBlock } from "./loadData";

export const dynamic = "force-dynamic";

const KPI_TITLES: Record<string, string> = {
  created:        "Explorar · Creados en período",
  active_now:     "Explorar · Activos ahora",
  urgent_active:  "Explorar · Urgentes activos",
  urgent_period:  "Explorar · Urgentes en período",
  today_created:  "Explorar · Creados hoy",
  finished:       "Explorar · Finalizados",
  cancelled:      "Explorar · Cancelados",
  incidents:      "Explorar · Incidencias",
};

export default async function StatsExplorePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>> | Record<string, string>;
}) {
  const sp = await Promise.resolve(searchParams as Record<string, string>);

  const now  = new Date();
  const defF = formatDateOnlyLocal(new Date(now.getFullYear(), now.getMonth(), 1));
  const defT = formatDateOnlyLocal(now);

  let from = sp.from || defF;
  let to   = sp.to || defT;
  const scope = parseStatsScope(sp.scope);

  let view = sp.view || "breakdown";
  if (view !== "kpi" && view !== "breakdown" && view !== "slice") view = "breakdown";

  const kpi = isExploreKpi(sp.kpi) ? sp.kpi : undefined;
  const dim = isExploreDim(sp.dim) ? sp.dim : view === "breakdown" ? "status" : undefined;
  const val = sp.val;

  if (view === "slice" && (!dim || val == null)) {
    view = "breakdown";
  }

  const cFrom = sp.cFrom;
  const cTo   = sp.cTo;

  const primary =
    (await loadExploreBlock(view, kpi, dim, val, from, to, scope)) ??
    (await loadExploreBlock("breakdown", undefined, "status", undefined, from, to, scope));

  let secondary = null;
  if (cFrom && cTo) {
    secondary =
      (await loadExploreBlock(view, kpi, dim, val, cFrom, cTo, scope)) ??
      null;
  }

  let pageTitle = "Explorar estadísticas";
  if (view === "kpi" && kpi) pageTitle = KPI_TITLES[kpi] ?? pageTitle;
  else if (view === "breakdown" && dim) pageTitle = `Explorar · Desglose (${dim})`;
  else if (view === "slice" && dim && val) pageTitle = `Explorar · ${dim}: ${val}`;

  return (
    <main className="p-4 sm:p-6 max-w-[1600px] mx-auto">
      <ExploreClient
        initial={{
          from,
          to,
          scope,
          view,
          kpi,
          dim,
          val,
          cFrom: cFrom || undefined,
          cTo:   cTo || undefined,
        }}
        primary={primary!}
        secondary={secondary}
        pageTitle={pageTitle}
      />
    </main>
  );
}
