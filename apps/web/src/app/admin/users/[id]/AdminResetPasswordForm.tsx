"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import {
  adminResetUserPassword,
  type AdminResetPasswordState,
} from "./actions";

const initial: AdminResetPasswordState = { error: null, ok: false };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-amber-700 text-white px-4 py-2 text-sm font-medium hover:bg-amber-800 disabled:opacity-50 transition-colors"
    >
      {pending ? "Guardando…" : "Establecer nueva contraseña"}
    </button>
  );
}

export default function AdminResetPasswordForm({ userId }: { userId: string }) {
  const [state, formAction] = useActionState(adminResetUserPassword, initial);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
    }
  }, [state.ok]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <input type="hidden" name="userId" value={userId} />

      {state.ok && (
        <p className="text-sm font-medium text-green-800 bg-green-50 border border-green-100 rounded-lg px-3 py-2">
          Contraseña actualizada. El usuario puede iniciar sesión con la nueva clave.
        </p>
      )}
      {state.error && (
        <p className="text-sm font-medium text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          {state.error}
        </p>
      )}

      <div className="grid sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label htmlFor="adminNewPassword" className="text-xs font-medium text-gray-600">
            Nueva contraseña
          </label>
          <input
            id="adminNewPassword"
            name="newPassword"
            type="password"
            autoComplete="new-password"
            minLength={8}
            className="border border-gray-200 rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:ring-2 focus:ring-amber-200"
            placeholder="Mínimo 8 caracteres"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="adminConfirmPassword" className="text-xs font-medium text-gray-600">
            Confirmar
          </label>
          <input
            id="adminConfirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            minLength={8}
            className="border border-gray-200 rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:ring-2 focus:ring-amber-200"
            placeholder="Repite la contraseña"
          />
        </div>
      </div>

      <SubmitButton />
    </form>
  );
}
