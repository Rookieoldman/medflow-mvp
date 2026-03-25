import { fDateTime } from "@/lib/format";

const STATUS_LABELS: Record<string, string> = {
  SOLICITADO: "Solicitado",
  ASIGNADO:   "Asignado",
  EN_CURSO:   "En curso",
  EN_PRUEBA:  "En prueba",
  FINALIZADO: "Finalizado",
  PAUSADO:    "Pausado",
  CANCELADO:  "Cancelado",
};

const STATUS_DOT: Record<string, string> = {
  SOLICITADO: "bg-blue-400",
  ASIGNADO:   "bg-yellow-400",
  EN_CURSO:   "bg-green-500",
  EN_PRUEBA:  "bg-violet-500",
  FINALIZADO: "bg-gray-400",
  PAUSADO:    "bg-orange-400",
  CANCELADO:  "bg-red-500",
};

type Event = {
  id:         string;
  toStatus:   string;
  fromStatus: string | null;
  note:       string | null;
  createdAt:  Date;
  actor: {
    firstName: string | null;
    lastName1: string | null;
    email:     string;
    role:      string;
  };
};

const ROLE_LABEL: Record<string, string> = {
  TECNICO:  "Técnico",
  CELADOR:  "Celador",
  ADMIN:    "Admin",
};

export function TransferTimeline({ events }: { events: Event[] }) {
  if (events.length === 0) {
    return (
      <p className="text-sm text-gray-400 italic">Sin historial registrado.</p>
    );
  }

  return (
    <ol className="relative border-l border-gray-200 space-y-0">
      {events.map((e, i) => {
        const actorName =
          [e.actor.firstName, e.actor.lastName1].filter(Boolean).join(" ") ||
          e.actor.email;

        return (
          <li key={e.id} className="mb-6 ml-5">
            {/* dot */}
            <span
              className={`absolute -left-2 flex items-center justify-center w-4 h-4 rounded-full ring-4 ring-white ${
                STATUS_DOT[e.toStatus] ?? "bg-gray-300"
              }`}
            />

            <div className="flex flex-wrap items-baseline gap-2">
              <span className="font-medium text-sm text-gray-900">
                {STATUS_LABELS[e.toStatus] ?? e.toStatus}
              </span>
              {e.fromStatus && (
                <span className="text-xs text-gray-400">
                  desde {STATUS_LABELS[e.fromStatus] ?? e.fromStatus}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-0.5">
              <span className="text-xs text-gray-500">
                {actorName}
                <span className="text-gray-300 mx-1">·</span>
                {ROLE_LABEL[e.actor.role] ?? e.actor.role}
              </span>
              <span className="text-xs text-gray-400">
                {fDateTime(e.createdAt)}
              </span>
            </div>

            {e.note && (
              <p className="mt-1 text-xs text-gray-500 italic">{e.note}</p>
            )}
          </li>
        );
      })}
    </ol>
  );
}
