"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { changePassword, type ChangePasswordState } from "./actions";

const initial: ChangePasswordState = { error: null, ok: false };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full sm:w-auto rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 transition-colors"
    >
      {pending ? "Guardando…" : "Actualizar contraseña"}
    </button>
  );
}

export default function ChangePasswordForm() {
  const [state, formAction] = useFormState(changePassword, initial);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
    }
  }, [state.ok]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      {state.ok && (
        <p className="text-sm font-medium text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2">
          Contraseña actualizada correctamente.
        </p>
      )}
      {state.error && (
        <p className="text-sm font-medium text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          {state.error}
        </p>
      )}

      <div>
        <label htmlFor="currentPassword" className="block text-xs font-medium text-gray-600 mb-1">
          Contraseña actual
        </label>
        <input
          id="currentPassword"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
          className="w-full max-w-md border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
        />
      </div>
      <div>
        <label htmlFor="newPassword" className="block text-xs font-medium text-gray-600 mb-1">
          Nueva contraseña (mín. 8 caracteres)
        </label>
        <input
          id="newPassword"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className="w-full max-w-md border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
        />
      </div>
      <div>
        <label htmlFor="confirmPassword" className="block text-xs font-medium text-gray-600 mb-1">
          Confirmar nueva contraseña
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className="w-full max-w-md border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
        />
      </div>

      <SubmitButton />
    </form>
  );
}
