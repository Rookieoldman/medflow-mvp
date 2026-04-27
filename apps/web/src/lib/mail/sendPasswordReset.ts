import nodemailer from "nodemailer";

export function isPasswordResetMailConfigured(): boolean {
  return !!(process.env.SMTP_HOST?.trim() && process.env.EMAIL_FROM?.trim());
}

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  if (!isPasswordResetMailConfigured()) {
    throw new Error("SMTP no configurado");
  }

  const port = Number(process.env.SMTP_PORT || 587);
  const secure =
    process.env.SMTP_SECURE === "true" || port === 465;

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure,
    auth:
      process.env.SMTP_USER != null && process.env.SMTP_USER !== ""
        ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD ?? "",
          }
        : undefined,
  });

  const from = process.env.EMAIL_FROM!.trim();
  const safeUrl = resetUrl.replace(/"/g, "%22");

  await transporter.sendMail({
    from,
    to,
    subject: "Restablecer contraseña · MedFlow",
    text: [
      "Has solicitado restablecer tu contraseña en MedFlow.",
      "",
      `Abre este enlace (válido 1 hora):`,
      resetUrl,
      "",
      "Si no fuiste tú, ignora este mensaje.",
    ].join("\n"),
    html: `<p>Has solicitado restablecer tu contraseña en <strong>MedFlow</strong>.</p>
<p><a href="${safeUrl}">Restablecer contraseña</a> · el enlace caduca en <strong>1 hora</strong>.</p>
<p style="color:#64748b;font-size:13px;">Si no fuiste tú, puedes ignorar este correo.</p>`,
  });
}
