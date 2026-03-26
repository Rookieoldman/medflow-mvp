import { parseStatsScope } from "@/lib/adminStatsPeriod";
import {
  formatDateOnlyLocal,
  isExploreDim,
  isExploreKpi,
} from "@/lib/statsExplore";
import ExploreClient from "./ExploreClient";
import { loadExploreBlock } from "./loadData";
import { loadExploreTrends } from "./trends";

export const dynamic = "force-dynamic";

const KPI_TITLES: Record<string, string> = {
  created:                 "Explorar · Creados en período",
  active_now:              "Explorar · Activos ahora",
  urgent_active:           "Explorar · Urgentes activos",
  urgent_period:           "Explorar · Urgentes en período",
  today_created:           "Explorar · Creados hoy",
  finished:                "Explorar · Finalizados",
  cancelled:               "Explorar · Cancelados",
  incidents:               "Explorar · Incidencias",
  avg_closure_time:        "Explorar · Tiempo medio hasta cierre",
  success_among_closed:    "Explorar · Éxito entre cerrados",
  completion_vs_created:   "Explorar · Finalizados / creados",
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

  const trendCtx = { view, kpi, dim, val };

  const [primary, trendsPrimary, trendsSecondary, secondary] = await Promise.all([
    (async () => {
      return (
        (await loadExploreBlock(view, kpi, dim, val, from, to, scope)) ??
        (await loadExploreBlock("breakdown", undefined, "status", undefined, from, to, scope))
      );
    })(),
    loadExploreTrends(from, to, scope, trendCtx),
    cFrom && cTo ? loadExploreTrends(cFrom, cTo, scope, trendCtx) : Promise.resolve(null),
    cFrom && cTo
      ? (async () => {
          return (
            (await loadExploreBlock(view, kpi, dim, val, cFrom, cTo, scope)) ??
            null
          );
        })()
      : Promise.resolve(null),
  ]);

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
        trendsPrimary={trendsPrimary}
        trendsSecondary={trendsSecondary}
        pageTitle={pageTitle}
      />
    </main>
  );
}
