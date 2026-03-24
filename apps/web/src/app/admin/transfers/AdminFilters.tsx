"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

type User = {
  id: string;
  email: string;
};

export default function AdminFilters({ users }: { users: User[] }) {
  const router = useRouter();
  const params = useSearchParams();

  const [role, setRole]         = useState(params.get("role") ?? "");
  const [userId, setUserId]     = useState(params.get("userId") ?? "");
  const [status, setStatus]     = useState(params.get("status") ?? "");
  const [testType, setTestType] = useState(params.get("testType") ?? "");

  function applyFilters() {
    const sp = new URLSearchParams();
    if (role)     sp.set("role", role);
    if (userId)   sp.set("userId", userId);
    if (status)   sp.set("status", status);
    if (testType) sp.set("testType", testType);
    router.push(`/admin/transfers?${sp.toString()}`);
  }

  function clearFilters() {
    setRole(""); setUserId(""); setStatus(""); setTestType("");
    router.push("/admin/transfers");
  }

  const selectClass =
    "border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-300 w-full";

  return (
    <div className="border rounded-xl p-4 bg-white shadow-sm space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <select value={role} onChange={(e) => setRole(e.target.value)} className={selectClass}>
          <option value="">Todos los roles</option>
          <option value="TECNICO">Técnico</option>
          <option value="CELADOR">Celador</option>
        </select>

        <select value={userId} onChange={(e) => setUserId(e.target.value)} className={selectClass}>
          <option value="">Todos los usuarios</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>{u.email}</option>
          ))}
        </select>

        <select value={status} onChange={(e) => setStatus(e.target.value)} className={selectClass}>
          <option value="">Todos los estados</option>
          <option value="SOLICITADO">Solicitado</option>
          <option value="ASIGNADO">Asignado</option>
          <option value="EN_CURSO">En curso</option>
          <option value="EN_PRUEBA">En prueba</option>
          <option value="PAUSADO">Pausado</option>
          <option value="FINALIZADO">Finalizado</option>
          <option value="CANCELADO">Cancelado</option>
        </select>

        <select value={testType} onChange={(e) => setTestType(e.target.value)} className={selectClass}>
          <option value="">Todos los tipos</option>
          <option value="RM">RM</option>
          <option value="TC">TC</option>
          <option value="RX">RX</option>
          <option value="ECO">ECO</option>
          <option value="MEDICINA_NUCLEAR">Medicina Nuclear</option>
        </select>
      </div>

      <div className="flex gap-2">
        <button
          onClick={applyFilters}
          className="rounded-lg bg-black text-white px-4 py-2 text-sm hover:bg-gray-800 transition-colors"
        >
          Aplicar filtros
        </button>
        <button
          onClick={clearFilters}
          className="rounded-lg border px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
        >
          Limpiar
        </button>
      </div>
    </div>
  );
}
