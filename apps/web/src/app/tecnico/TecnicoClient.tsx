"use client";

import Link from "next/link";
import { StatusBadge } from "@/components/StatusBadge";
import { PriorityBadge } from "@/components/PriorityBadge";
import ElapsedTime from "@/components/ElapsedTime";
import { initials } from "@/lib/patient";
import { useEffect, useState } from "react";

type Transfer = {
  id: string;
  mrn: string;
  patientFullName: string;
  location: string;
  testType: string;
  priority: string;
  status: string;
  createdAt: string;
};

export default function TecnicoClient() {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let timer: NodeJS.Timeout;

    const fetchTransfers = async () => {
      const res = await fetch("/api/tecnico/transfers");
      if (res.ok) {
        setTransfers(await res.json());
      }
      setLoading(false);
    };

    fetchTransfers();
    timer = setInterval(fetchTransfers, 15000);
    return () => clearInterval(timer);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <span className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
        Cargando solicitudes...
      </div>
    );
  }

  if (transfers.length === 0) {
    return <p className="text-sm text-gray-400 italic">Aún no hay solicitudes activas.</p>;
  }

  return (
    <div className="space-y-3">
      {transfers.map((t) => (
        <div
          key={t.id}
          className="relative border rounded p-4 grid grid-cols-[1fr_auto] gap-3"
        >
          <div className="absolute top-2 right-2">
            <ElapsedTime createdAt={t.createdAt} />
          </div>

          <div className="space-y-1">
            <div className="font-mono text-sm text-gray-500">{t.mrn}</div>

            <div className="text-2xl font-semibold">
              {initials(t.patientFullName)}
            </div>

            <div className="text-sm text-gray-600">
              {t.location} → {t.testType}
            </div>

            <div className="flex gap-2 flex-wrap">
              <PriorityBadge priority={t.priority} />
              <StatusBadge status={t.status} />
            </div>
          </div>

          <div className="flex items-center">
            <Link
              href={`/tecnico/transfers/${t.id}`}
              className="underline text-sm whitespace-nowrap"
            >
              Ver
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}