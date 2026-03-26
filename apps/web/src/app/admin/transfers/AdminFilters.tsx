"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";

type User = { id: string; name: string; role: string };

const SELECT =
  "border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-300 w-full";

const STATUS_OPTIONS = [
  { value: "SOLICITADO", label: "Solicitado"  },
  { value: "ASIGNADO",   label: "Asignado"    },
  { value: "EN_CURSO",   label: "En curso"    },
  { value: "EN_PRUEBA",  label: "En prueba"   },
  { value: "PAUSADO",    label: "Pausado"     },
  { value: "FINALIZADO", label: "Finalizado"  },
  { value: "CANCELADO",  label: "Cancelado"   },
];

const ACTIVE_STATUSES   = ["SOLICITADO","ASIGNADO","EN_CURSO","EN_PRUEBA","PAUSADO"];
const INACTIVE_STATUSES = ["FINALIZADO","CANCELADO"];

export default function AdminFilters({ users }: { users: User[] }) {
  const router = useRouter();
  const params = useSearchParams();

  const [search,     setSearch]     = useState(params.get("search")     ?? "");
  const [tecnicoId,  setTecnicoId]  = useState(params.get("tecnicoId")  ?? "");
  const [celadorId,  setCeladorId]  = useState(params.get("celadorId")  ?? "");
  const [status,     setStatus]     = useState(params.get("status")     ?? "");
  const [priority,   setPriority]   = useState(params.get("priority")   ?? "");
  const [testType,   setTestType]   = useState(params.get("testType")   ?? "");
  const [difficulty, setDifficulty] = useState(params.get("difficulty") ?? "");
  const [dateRange,  setDateRange]  = useState(params.get("dateRange")  ?? "");

  const tecnicos = users.filter((u) => u.role === "TECNICO");
  const celadores = users.filter((u) => u.role === "CELADOR");

  const activeCount = [search, tecnicoId, celadorId, status, priority, testType, difficulty, dateRange]
    .filter(Boolean).length;

  const apply = useCallback(() => {
    const sp = new URLSearchParams();
    if (search)     sp.set("search",     search.trim());
    if (tecnicoId)  sp.set("tecnicoId",  tecnicoId);
    if (celadorId)  sp.set("celadorId",  celadorId);
    if (status)     sp.set("status",     status);
    if (priority)   sp.set("priority",   priority);
    if (testType)   sp.set("testType",   testType);
    if (difficulty) sp.set("difficulty", difficulty);
    if (dateRange)  sp.set("dateRange",  dateRange);
    router.push(`/admin/transfers?${sp.toString()}`);
  }, [search, tecnicoId, celadorId, status, priority, testType, difficulty, dateRange, router]);

  const clear = () => {
    setSearch(""); setTecnicoId(""); setCeladorId(""); setStatus("");
    setPriority(""); setTestType(""); setDifficulty(""); setDateRange("");
    router.push("/admin/transfers");
  };

  return (
    <div className="border border-gray-200 rounded-xl p-4 bg-white shadow-sm space-y-3">

      {/* Fila 1: búsqueda + estado rápido */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Búsqueda libre */}
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
          <input
            type="text"
            placeholder="Buscar por paciente o nº historia…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && apply()}
            className="border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-300 w-full"
          />
        </div>

        {/* Acceso rápido estado */}
        <div className="flex gap-1.5 flex-wrap">
          {[
            { label: "Activos",     value: "__ACTIVE__",   color: "bg-green-50 text-green-700 border-green-200"  },
            { label: "Finalizados", value: "__INACTIVE__", color: "bg-gray-50 text-gray-500 border-gray-200"     },
          ].map((chip) => (
            <button
              key={chip.value}
              onClick={() => { setStatus(chip.value); }}
              className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                status === chip.value ? chip.color : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* Fila 2: selectores */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={SELECT}>
          <option value="">Todos los estados</option>
          <optgroup label="Activos">
            {ACTIVE_STATUSES.map((s) => (
              <option key={s} value={s}>{STATUS_OPTIONS.find((o) => o.value === s)?.label ?? s}</option>
            ))}
          </optgroup>
          <optgroup label="Cerrados">
            {INACTIVE_STATUSES.map((s) => (
              <option key={s} value={s}>{STATUS_OPTIONS.find((o) => o.value === s)?.label ?? s}</option>
            ))}
          </optgroup>
        </select>

        <select value={priority} onChange={(e) => setPriority(e.target.value)} className={SELECT}>
          <option value="">Todas las prioridades</option>
          <option value="URGENTE">🔴 Urgente</option>
          <option value="NORMAL">⚪ Normal</option>
        </select>

        <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className={SELECT}>
          <option value="">Todas las dificultades</option>
          <option value="CRITICO">🔴 Crítico</option>
          <option value="MODERADO">🟡 Moderado</option>
          <option value="BANAL">🟢 Banal</option>
        </select>

        <select value={testType} onChange={(e) => setTestType(e.target.value)} className={SELECT}>
          <option value="">Todos los tipos</option>
          <option value="RM">RM</option>
          <option value="TC">TC</option>
          <option value="RX">RX</option>
          <option value="ECO">Eco</option>
          <option value="MEDICINA_NUCLEAR">Med. Nuclear</option>
        </select>

        <select value={tecnicoId} onChange={(e) => setTecnicoId(e.target.value)} className={SELECT}>
          <option value="">Todos los técnicos</option>
          {tecnicos.map((u) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>

        <select value={celadorId} onChange={(e) => setCeladorId(e.target.value)} className={SELECT}>
          <option value="">Todos los celadores</option>
          {celadores.map((u) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>
      </div>

      {/* Fila 3: rango de fechas + botones */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-1.5 flex-wrap">
          {[
            { label: "Hoy",          value: "today"   },
            { label: "Últimos 7d",   value: "week"    },
            { label: "Últimos 30d",  value: "month"   },
            { label: "Todo",         value: ""        },
          ].map((chip) => (
            <button
              key={chip.value}
              onClick={() => setDateRange(chip.value)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                dateRange === chip.value
                  ? "bg-gray-900 text-white border-gray-900"
                  : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>

        <div className="flex gap-2 shrink-0">
          <button
            onClick={apply}
            className="rounded-lg bg-gray-900 text-white px-4 py-2 text-sm font-medium hover:bg-gray-700 transition-colors"
          >
            Aplicar{activeCount > 0 && ` · ${activeCount}`}
          </button>
          {activeCount > 0 && (
            <button
              onClick={clear}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Limpiar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
