"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();

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
      // 🔁 Redirección centralizada en /
      router.push("/");
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-10">
      <form
        onSubmit={handleSubmit}
        className="border border-gray-200 rounded-xl p-6 w-full max-w-sm space-y-4 bg-white shadow-sm"
      >
        <h1 className="text-xl font-semibold text-center text-gray-900">MedFlow · Login</h1>

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

        {error && (
          <p className="text-sm text-red-600 text-center">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="bg-gray-900 text-white w-full py-2.5 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
        >
          {loading ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </main>
  );
}