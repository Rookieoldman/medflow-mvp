"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import {
  requestPasswordReset,
  type ForgotPasswordState,
} from "../password-reset-actions";

const initial: ForgotPasswordState = { error: null, message: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg bg-gray-900 text-white py-2.5 text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
    >
      {pending ? "Enviando…" : "Enviar enlace"}
    </button>
  );
}

export default function ForgotPasswordForm() {
  const [state, formAction] = useActionState(requestPasswordReset, initial);

  return (
    <form action={formAction} className="space-y-4">
      {state.message && (
        <p className="text-sm font-medium text-green-800 bg-green-50 border border-green-100 rounded-lg px-3 py-2">
          {state.message}
        </p>
      )}
      {state.error && (
        <p className="text-sm font-medium text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          {state.error}
        </p>
      )}

      <div>
        <label htmlFor="email" className="block text-xs font-medium text-gray-600 mb-1">
          Correo electrónico
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="border border-gray-200 rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
          placeholder="tu.correo@hospital.org"
        />
      </div>

      <SubmitButton />

      <p className="text-center">
        <Link href="/login" className="text-sm text-blue-600 hover:text-blue-800">
          ← Volver al inicio de sesión
        </Link>
      </p>
    </form>
  );
}
