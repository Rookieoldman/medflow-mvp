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

  const [role, setRole] = useState(params.get("role") ?? "");
  const [userId, setUserId] = useState(params.get("userId") ?? "");
  const [status, setStatus] = useState(params.get("status") ?? "");
  const [testType, setTestType] = useState(params.get("testType") ?? "");

  function applyFilters() {
    const sp = new URLSearchParams();
    if (role) sp.set("role", role);
    if (userId) sp.set("userId", userId);
    if (status) sp.set("status", status);
    if (testType) sp.set("testType", testType);
    router.push(`/admin?${sp.toString()}`);
  }

  function clearFilters() {
    setRole("");
    setUserId("");
    setStatus("");
    setTestType("");
    router.push("/admin");
  }

  const selectClass =
    "rounded border border-gray-600 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <section className="rounded-lg border border-gray-700 bg-transparent p-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <select value={role} onChange={(e) => setRole(e.target.value)} className={selectClass}>
          <option value="">Rol</option>
          <option value="TECNICO">Técnico</option>
          <option value="CELADOR">Celador</option>
        </select>

        <select value={userId} onChange={(e) => setUserId(e.target.value)} className={selectClass}>
          <option value="">Usuario</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.email}
            </option>
          ))}
        </select>

        <select value={status} onChange={(e) => setStatus(e.target.value)} className={selectClass}>
          <option value="">Estado</option>
          <option value="SOLICITADO">SOLICITADO</option>
          <option value="ASIGNADO">ASIGNADO</option>
          <option value="EN_CURSO">EN_CURSO</option>
          <option value="EN_LA_PRUEBA">EN_LA_PRUEBA</option>
          <option value="FINALIZADO">FINALIZADO</option>
          <option value="CANCELADO">CANCELADO</option>
        </select>

        <select value={testType} onChange={(e) => setTestType(e.target.value)} className={selectClass}>
          <option value="">Tipo de prueba</option>
          <option value="RM">RM</option>
          <option value="TC">TC</option>
          <option value="RX">RX</option>
          <option value="ECO">ECO</option>
          <option value="MEDICINA_NUCLEAR">Medicina Nuclear</option>
        </select>
      </div>

      <div className="mt-4 flex gap-2">
        <button
          onClick={applyFilters}
          className="rounded border border-gray-600 px-4 py-2 text-sm hover:bg-gray-500/10"
        >
          Aplicar filtros
        </button>

        <button
          onClick={clearFilters}
          className="rounded border border-gray-600 px-4 py-2 text-sm text-gray-400 hover:bg-gray-500/10"
        >
          Limpiar
        </button>
      </div>
    </section>
  );
}