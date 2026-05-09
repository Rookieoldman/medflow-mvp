"use client";

import { useEffect, useRef, useState } from "react";
import { signIn } from "next-auth/react";
import { medhubAppsUrl } from "@/lib/medhub-sso";

type JwtPrecheck = "missing" | "invalid" | "valid";

type Props = {
  token?: string;
  jwtPrecheck: JwtPrecheck;
};

export function MedhubSsoClient({ token = "", jwtPrecheck }: Props) {
  const [sessionError, setSessionError] = useState(false);
  const hubApps = medhubAppsUrl();
  const ssoAttempt = useRef(0);

  useEffect(() => {
    if (jwtPrecheck !== "valid" || !token) return;

    const id = ++ssoAttempt.current;

    (async () => {
      const res = await signIn("medhub-sso", {
        medhubToken: token,
        redirect: false,
        callbackUrl: "/",
      });
      if (id !== ssoAttempt.current) return;
      if (res?.error || !res?.ok) {
        setSessionError(true);
        return;
      }
      const fb = "/";
      const dest =
        typeof res.url === "string" && res.url.length > 0
          ? /^https?:\/\//i.test(res.url)
            ? res.url
            : `${window.location.origin}${res.url.startsWith("/") ? res.url : `/${res.url}`}`
          : fb;
      window.location.assign(dest);
    })();
  }, [token, jwtPrecheck]);

  if (jwtPrecheck === "missing") {
    return (
      <div className="w-full max-w-md mx-auto text-center space-y-4">
        <div className="border border-gray-200 rounded-xl p-8 bg-white shadow-sm space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Abre MEDFLOW desde MEDHUB
          </h2>
          <p className="text-sm text-gray-600">
            Este acceso solo funciona con el enlace del portal MEDHUB (token de un solo uso).
          </p>
          {hubApps ? (
            <a
              href={hubApps}
              className="inline-flex justify-center rounded-lg bg-gray-900 px-4 py-3 text-sm font-medium text-white hover:bg-gray-800"
            >
              Ir al portal MEDHUB
            </a>
          ) : (
            <p className="text-xs text-gray-500">
              Configura{" "}
              <code className="rounded bg-gray-100 px-1">NEXT_PUBLIC_MEDHUB_URL</code> en{" "}
              <code className="rounded bg-gray-100 px-1">.env</code>.
            </p>
          )}
        </div>
      </div>
    );
  }

  if (jwtPrecheck === "invalid") {
    return (
      <div className="w-full max-w-md mx-auto text-center space-y-4">
        <div className="border border-gray-200 rounded-xl p-8 bg-white shadow-sm space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Enlace caducado o no válido
          </h2>
          <p className="text-sm text-gray-600">
            El token no es válido o ha caducado. Vuelve a pulsar MEDFLOW en el hub de
            MEDHUB (reinicia también{" "}
            <code className="rounded bg-gray-100 px-1">npm run dev</code> del portal si
            cambiaste código o secrets).
          </p>
          <p className="text-left text-xs text-gray-500">
            Comprueba: mismo{" "}
            <code className="rounded bg-gray-100 px-1">MEDHUB_JWT_SECRET</code> en MEDHUB,
            MEDSIGN y MedFlow; usuario de organización (no SuperUser).
          </p>
          {hubApps ? (
            <a
              href={hubApps}
              className="inline-flex justify-center rounded-lg bg-gray-900 px-4 py-3 text-sm font-medium text-white hover:bg-gray-800"
            >
              Volver a MEDHUB
            </a>
          ) : null}
        </div>
      </div>
    );
  }

  if (sessionError) {
    return (
      <div className="w-full max-w-md mx-auto text-center space-y-4">
        <div className="border border-gray-200 rounded-xl p-8 bg-white shadow-sm space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">
            El token es válido pero no se ha podido crear la sesión
          </h2>
          <p className="text-sm text-gray-600">
            Suele ocurrir cuando la base de datos de MedFlow no está en marcha o falla
            Prisma al crear/actualizar el usuario local.
          </p>
          <pre className="rounded-lg bg-gray-50 p-3 text-left text-xs text-gray-800 overflow-x-auto">
            Revisa <code className="rounded bg-white px-1">DATABASE_URL</code> en{" "}
            <code className="rounded bg-white px-1">.env</code> /{" "}
            <code className="rounded bg-white px-1">.env.local</code> (MedFlow suele usar{" "}
            <code className="rounded bg-white px-1">localhost:5432</code> con el usuario{" "}
            <code className="rounded bg-white px-1">medflow</code>). Si está exportada en
            la terminal, Next la prioriza sobre el archivo — quítala o reinicia sin
            exportarla. Arranca PostgreSQL y{" "}
            <code className="rounded bg-white px-1">npx prisma migrate dev</code>.
          </pre>
          <p className="text-xs text-gray-500">
            Revisa la terminal de{" "}
            <code className="rounded bg-gray-100 px-1">next dev</code>: deben aparecer logs{" "}
            <code className="rounded bg-gray-100 px-1">[next-auth][medhub-sso]</code>.
          </p>
          {hubApps ? (
            <a
              href={hubApps}
              className="inline-flex justify-center rounded-lg bg-gray-900 px-4 py-3 text-sm font-medium text-white hover:bg-gray-800"
            >
              Volver a MEDHUB
            </a>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto text-center border border-gray-200 rounded-xl p-10 bg-white shadow-sm">
      <p className="text-gray-700">Conectando con MEDHUB…</p>
      <p className="mt-2 text-xs text-gray-500">No cierres esta ventana.</p>
    </div>
  );
}
