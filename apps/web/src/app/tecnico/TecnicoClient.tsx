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

  useEffect(() => {
    let timer: NodeJS.Timeout;

    const fetchTransfers = async () => {
      const res = await fetch("/api/tecnico/transfers");
      if (res.ok) {
        setTransfers(await res.json());
      }
    };

    fetchTransfers();

    timer = setInterval(fetchTransfers, 15000); // ⏱️ 15s normal

    return () => clearInterval(timer);
  }, []);

  if (transfers.length === 0) {
    return <p className="text-sm text-gray-600">Aún no hay solicitudes.</p>;
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