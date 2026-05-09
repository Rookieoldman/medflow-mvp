"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { medhubAppsUrl } from "@/lib/medhub-sso";

type Props = {
  allowPasswordLogin: boolean;
};

export function LoginClient({ allowPasswordLogin }: Props) {
  const router = useRouter();
  const hubApps = medhubAppsUrl();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (res?.error) {
      setError("Credenciales incorrectas");
    } else {
      router.push("/");
      router.refresh();
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm space-y-6">
        <div className="border border-gray-200 rounded-xl p-6 bg-white shadow-sm space-y-4">
          <h1 className="text-xl font-semibold text-center text-gray-900">
            MedFlow · Acceso
          </h1>

          <div className="rounded-lg border border-gray-100 bg-gray-50 p-4 space-y-2">
            <h2 className="text-sm font-semibold text-gray-900">
              Acceso recomendado (MEDHUB)
            </h2>
            <p className="text-xs text-gray-600">
              Inicia sesión en el portal MEDHUB y abre MEDFLOW desde el hub de aplicaciones.
            </p>
            {hubApps ? (
              <a
                href={hubApps}
                className="flex justify-center rounded-lg bg-gray-900 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
              >
                Abrir portal MEDHUB
              </a>
            ) : (
              <p className="text-xs text-amber-800">
                Define{" "}
                <code className="rounded bg-white px-1">NEXT_PUBLIC_MEDHUB_URL</code> para
                mostrar el enlace al portal.
              </p>
            )}
          </div>

          {allowPasswordLogin ? (
            <>
              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-[10px] uppercase tracking-wide">
                  <span className="bg-white px-2 text-gray-400">
                    Solo desarrollo local
                  </span>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="border border-gray-200 rounded-lg p-2.5 w-full text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
                  required
                  autoComplete="username"
                />

                <div className="space-y-1">
                  <input
                    type="password"
                    placeholder="Contraseña"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="border border-gray-200 rounded-lg p-2.5 w-full text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
                    required
                    autoComplete="current-password"
                  />
                  <p className="text-right">
                    <Link
                      href="/login/forgot"
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      ¿Has olvidado tu contraseña?
                    </Link>
                  </p>
                </div>

                {process.env.NODE_ENV === "development" ? (
                  <div className="rounded-lg border border-dashed border-amber-200 bg-amber-50/90 p-3 space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-900/85">
                      Dev · usuarios demo (<code className="font-mono">1234</code>)
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {(
                        [
                          {
                            label: "Admin",
                            email: "admin@medflow.dev",
                            password: "1234",
                          },
                          {
                            label: "Técnico",
                            email: "tecnico@medflow.dev",
                            password: "1234",
                          },
                          {
                            label: "Celador",
                            email: "celador@medflow.dev",
                            password: "1234",
                          },
                        ] as const
                      ).map((p) => (
                        <button
                          key={p.label}
                          type="button"
                          className="rounded-md border border-amber-300 bg-white px-2.5 py-1.5 text-xs font-medium text-amber-950 shadow-sm hover:bg-amber-100"
                          onClick={() => {
                            setEmail(p.email);
                            setPassword(p.password);
                          }}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-amber-900/70 leading-snug">
                      Contraseña demo: <code className="font-mono">1234</code>. Las cuentas
                      deben existir en la BD (céalas desde{" "}
                      <span className="font-medium">Admin → usuarios</span> o tu seed).
                    </p>
                  </div>
                ) : null}

                {error ? (
                  <p className="text-sm text-red-600 text-center">{error}</p>
                ) : null}

                <button
                  type="submit"
                  disabled={loading}
                  className="bg-gray-900 text-white w-full py-2.5 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
                >
                  {loading ? "Entrando…" : "Entrar"}
                </button>
              </form>
            </>
          ) : null}
        </div>

        <p className="text-center text-xs text-gray-400">
          MedFlow · Ecosistema MEDHUB
        </p>
      </div>
    </main>
  );
}
