"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

export default function LoginPage() {
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
      // El redirect por rol lo hará la página /
      window.location.href = "/";
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center">
      <form
        onSubmit={handleSubmit}
        className="border rounded p-6 w-full max-w-sm space-y-4"
      >
        <h1 className="text-xl font-semibold text-center">MedFlow · Login</h1>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border p-2 w-full"
          required
        />

        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="border p-2 w-full"
          required
        />

        {error && (
          <p className="text-sm text-red-600 text-center">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white w-full py-2 disabled:opacity-50"
        >
          {loading ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </main>
  );
}