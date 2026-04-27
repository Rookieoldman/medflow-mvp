import { Suspense } from "react";
import ResetPasswordForm from "./ResetPasswordForm";

export const dynamic = "force-dynamic";

export default function ResetPasswordPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="border border-gray-200 rounded-xl p-6 w-full max-w-sm space-y-5 bg-white shadow-sm">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Nueva contraseña</h1>
          <p className="text-sm text-gray-500 mt-1">Elige una contraseña segura para tu cuenta.</p>
        </div>
        <Suspense
          fallback={
            <p className="text-sm text-gray-500 text-center py-4">Cargando…</p>
          }
        >
          <ResetPasswordForm />
        </Suspense>
      </div>
    </main>
  );
}
