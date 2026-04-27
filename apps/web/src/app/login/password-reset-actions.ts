"use server";

import { createHash, randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import {
  isPasswordResetMailConfigured,
  sendPasswordResetEmail,
} from "@/lib/mail/sendPasswordReset";

const PASSWORD_MIN_LEN = 8;
const TOKEN_HOURS = 1;
const MAX_REQUESTS_PER_HOUR = 5;

export type ForgotPasswordState = {
  error: string | null;
  message: string | null;
};

const genericSent: ForgotPasswordState = {
  error: null,
  message:
    "Si existe una cuenta con ese correo, recibirás un enlace para restablecer la contraseña en unos minutos.",
};

export async function requestPasswordReset(
  _prev: ForgotPasswordState,
  formData: FormData
): Promise<ForgotPasswordState> {
  if (!isPasswordResetMailConfigured()) {
    return {
      error:
        "La recuperación por correo no está activada (falta SMTP_HOST y EMAIL_FROM en el servidor).",
      message: null,
    };
  }

  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  if (!email) {
    return { error: "Indica tu correo electrónico", message: null };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "El formato del correo no es válido", message: null };
  }

  const baseUrl = (process.env.NEXTAUTH_URL ?? "").trim().replace(/\/$/, "");
  if (!baseUrl) {
    return {
      error:
        "NEXTAUTH_URL no está configurado; no se puede generar el enlace de recuperación.",
      message: null,
    };
  }

  const user = await prisma.user.findFirst({
    where: {
      email: { equals: email, mode: "insensitive" },
      active: true,
    },
    select: { id: true, email: true },
  });

  if (!user) {
    return genericSent;
  }

  const since = new Date(Date.now() - 60 * 60 * 1000);
  const recent = await prisma.passwordResetToken.count({
    where: { userId: user.id, createdAt: { gte: since } },
  });
  if (recent >= MAX_REQUESTS_PER_HOUR) {
    return genericSent;
  }

  await prisma.passwordResetToken.deleteMany({
    where: { userId: user.id, usedAt: null },
  });

  const raw = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(raw).digest("hex");
  const expiresAt = new Date(Date.now() + TOKEN_HOURS * 60 * 60 * 1000);

  const row = await prisma.passwordResetToken.create({
    data: { userId: user.id, tokenHash, expiresAt },
  });

  const resetUrl = `${baseUrl}/login/reset?token=${encodeURIComponent(raw)}`;

  try {
    await sendPasswordResetEmail(user.email, resetUrl);
  } catch (e) {
    console.error("[password-reset] envío correo", e);
    await prisma.passwordResetToken.delete({ where: { id: row.id } }).catch(() => {});
    return {
      error:
        "No se ha podido enviar el correo. Inténtalo más tarde o contacta con administración.",
      message: null,
    };
  }

  return genericSent;
}

export type CompletePasswordResetState = {
  error: string | null;
  ok: boolean;
};

export async function completePasswordReset(
  _prev: CompletePasswordResetState,
  formData: FormData
): Promise<CompletePasswordResetState> {
  const token = String(formData.get("token") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (!token) {
    return { error: "Falta el enlace de recuperación. Abre el enlace del correo.", ok: false };
  }
  if (!password || !confirm) {
    return { error: "Indica la nueva contraseña y la confirmación", ok: false };
  }
  if (password.length < PASSWORD_MIN_LEN) {
    return {
      error: `La contraseña debe tener al menos ${PASSWORD_MIN_LEN} caracteres`,
      ok: false,
    };
  }
  if (password !== confirm) {
    return { error: "La confirmación no coincide", ok: false };
  }

  const tokenHash = createHash("sha256").update(token).digest("hex");

  const row = await prisma.passwordResetToken.findFirst({
    where: {
      tokenHash,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
  });

  if (!row) {
    return {
      error:
        "El enlace no es válido o ha caducado. Solicita uno nuevo desde «He olvidado mi contraseña».",
      ok: false,
    };
  }

  const hash = await bcrypt.hash(password, 10);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: row.userId },
      data: { password: hash },
    }),
    prisma.passwordResetToken.deleteMany({
      where: { userId: row.userId },
    }),
  ]);

  return { error: null, ok: true };
}
