"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  completePasswordReset,
  type CompletePasswordResetState,
} from "../password-reset-actions";

const initial: CompletePasswordResetState = { error: null, ok: false };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg bg-gray-900 text-white py-2.5 text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
    >
      {pending ? "Guardando…" : "Guardar nueva contraseña"}
    </button>
  );
}

export default function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token")?.trim() ?? "";
  const [state, formAction] = useActionState(completePasswordReset, initial);

  if (!token) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          Falta el enlace de recuperación. Abre el enlace que recibiste por correo o solicita uno nuevo.
        </p>
        <Link href="/login/forgot" className="text-sm text-blue-600 hover:text-blue-800 inline-block">
          Solicitar nuevo enlace
        </Link>
        <p>
          <Link href="/login" className="text-sm text-gray-500 hover:text-gray-800">
            ← Volver al inicio de sesión
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="token" value={token} />

      {state.ok && (
        <div className="space-y-3 text-center">
          <p className="text-sm font-medium text-green-800 bg-green-50 border border-green-100 rounded-lg px-3 py-2">
            Contraseña actualizada. Ya puedes iniciar sesión.
          </p>
          <Link
            href="/login"
            className="inline-block rounded-lg bg-gray-900 text-white px-4 py-2 text-sm font-medium hover:bg-gray-800"
          >
            Ir al login
          </Link>
        </div>
      )}

      {!state.ok && (
        <>
          {state.error && (
            <p className="text-sm font-medium text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {state.error}
            </p>
          )}

          <div>
            <label htmlFor="password" className="block text-xs font-medium text-gray-600 mb-1">
              Nueva contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              className="border border-gray-200 rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
              placeholder="Mínimo 8 caracteres"
            />
          </div>
          <div>
            <label htmlFor="confirm" className="block text-xs font-medium text-gray-600 mb-1">
              Confirmar contraseña
            </label>
            <input
              id="confirm"
              name="confirm"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              className="border border-gray-200 rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
            />
          </div>

          <SubmitButton />
        </>
      )}

      {!state.ok && (
        <p className="text-center">
          <Link href="/login" className="text-sm text-gray-500 hover:text-gray-800">
            ← Volver al inicio de sesión
          </Link>
        </p>
      )}
    </form>
  );
}
