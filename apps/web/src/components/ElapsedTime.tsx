"use client";

import { useEffect, useState } from "react";

function minutesBetween(from: Date, to: Date) {
  return Math.max(0, Math.floor((to.getTime() - from.getTime()) / 60000));
}

export default function ElapsedTime({
  createdAt,
}: {
  createdAt: string | Date;
}) {
  const created = new Date(createdAt);
  const [minutes, setMinutes] = useState(() =>
    minutesBetween(created, new Date()),
  );

  useEffect(() => {
    const id = setInterval(() => {
      setMinutes(minutesBetween(created, new Date()));
    }, 60_000); // cada minuto

    return () => clearInterval(id);
  }, [created]);

  if (minutes < 1) {
    return <span className="text-xs opacity-70">recién creado</span>;
  }

  return (
    <span
      className={`text-xs font-mono ${
        minutes >= 30
          ? "text-red-400"
          : minutes >= 15
            ? "text-yellow-400"
            : "text-foreground/70"
      }`}
    >
      {minutes} min
    </span>
  );
}
