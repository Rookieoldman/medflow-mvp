"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";
import type { StatsPeriodKey, StatsScopeKey } from "@/lib/adminStatsPeriod";
import { PERIOD_LABEL, SCOPE_LABEL } from "@/lib/adminStatsPeriod";

const PERIODS: StatsPeriodKey[] = ["7", "30", "90", "all"];
const SCOPES: StatsScopeKey[] = ["", "PLANTA", "URGENCIAS"];

export default function StatsPeriodFilters({
  period,
  scope,
  activeTab,
}: {
  period: StatsPeriodKey;
  scope:  StatsScopeKey;
  activeTab: string;
}) {
  const router   = useRouter();
  const sp       = useSearchParams();
  const [pending, startTransition] = useTransition();

  const push = useCallback(
    (next: { period?: StatsPeriodKey; scope?: StatsScopeKey }) => {
      const p = next.period ?? period;
      const s = next.scope ?? scope;
      const q = new URLSearchParams(sp.toString());
      q.set("tab", activeTab);
      q.set("period", p);
      if (s) q.set("scope", s);
      else q.delete("scope");
      startTransition(() => {
        router.push(`/admin/stats?${q.toString()}`);
      });
    },
    [router, sp, period, scope, activeTab]
  );

  return (
    <div
      className={`flex flex-col gap-4 border border-gray-200 rounded-xl bg-white p-4 sm:p-5 ${
        pending ? "opacity-70" : ""
      }`}
    >
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Período (traslados creados y repartos)
        </p>
        <div className="flex flex-wrap gap-2">
          {PERIODS.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => push({ period: key })}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                period === key
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {PERIOD_LABEL[key]}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Ámbito
        </p>
        <div className="flex flex-wrap gap-2">
          {SCOPES.map((key) => (
            <button
              key={key || "all-scope"}
              type="button"
              onClick={() => push({ scope: key })}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                scope === key
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {SCOPE_LABEL[key]}
            </button>
          ))}
        </div>
      </div>
      <p className="text-xs text-gray-400 leading-relaxed">
        Los gráficos y totales del período usan la <strong>fecha de creación</strong> del traslado.
        «Activos ahora» y «Urgentes activos» son una instantánea actual. El tiempo medio y
        «Finalizados» del bloque inferior se basan en traslados <strong>cerrados</strong> en el período.
      </p>
    </div>
  );
}
