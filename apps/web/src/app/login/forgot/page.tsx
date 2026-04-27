import ForgotPasswordForm from "./ForgotPasswordForm";

export const dynamic = "force-dynamic";

export default function ForgotPasswordPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="border border-gray-200 rounded-xl p-6 w-full max-w-sm space-y-5 bg-white shadow-sm">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Recuperar contraseña</h1>
          <p className="text-sm text-gray-500 mt-1">
            Te enviaremos un enlace para elegir una nueva contraseña (válido 1 hora).
          </p>
        </div>
        <ForgotPasswordForm />
      </div>
    </main>
  );
}
