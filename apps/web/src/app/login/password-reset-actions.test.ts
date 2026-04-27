import { createHash, randomBytes } from "crypto";
import { describe, expect, it, vi, beforeEach } from "vitest";

const mail = vi.hoisted(() => ({
  isPasswordResetMailConfigured: vi.fn(() => true),
  sendPasswordResetEmail: vi.fn(async () => {}),
}));

const db = vi.hoisted(() => ({
  user: {
    findFirst: vi.fn(),
    update: vi.fn(() => Promise.resolve({})),
  },
  passwordResetToken: {
    count: vi.fn(),
    deleteMany: vi.fn(() => Promise.resolve({ count: 0 })),
    create: vi.fn(),
    delete: vi.fn(() => Promise.resolve({})),
    findFirst: vi.fn(),
  },
  $transaction: vi.fn(async (ops: Array<Promise<unknown>>) => {
    await Promise.all(ops);
  }),
}));

vi.mock("@/lib/prisma", () => ({ prisma: db }));
vi.mock("@/lib/mail/sendPasswordReset", () => mail);

function form(entries: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(entries)) fd.set(k, v);
  return fd;
}

describe("requestPasswordReset", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mail.isPasswordResetMailConfigured.mockReturnValue(true);
    mail.sendPasswordResetEmail.mockResolvedValue(undefined);
    process.env.NEXTAUTH_URL = "http://localhost:3000";
  });

  it("rechaza si no hay SMTP configurado", async () => {
    mail.isPasswordResetMailConfigured.mockReturnValue(false);
    const { requestPasswordReset } = await import("./password-reset-actions");
    const r = await requestPasswordReset(
      { error: null, message: null },
      form({ email: "a@b.co" })
    );
    expect(r.message).toBeNull();
    expect(r.error).toContain("SMTP");
    expect(db.user.findFirst).not.toHaveBeenCalled();
  });

  it("rechaza email vacío o formato inválido", async () => {
    const { requestPasswordReset } = await import("./password-reset-actions");
    const empty = await requestPasswordReset(
      { error: null, message: null },
      form({ email: "  " })
    );
    expect(empty.error).toMatch(/correo/i);

    const bad = await requestPasswordReset(
      { error: null, message: null },
      form({ email: "no-es-email" })
    );
    expect(bad.error).toMatch(/válido|formato/i);
  });

  it("rechaza si falta NEXTAUTH_URL", async () => {
    delete process.env.NEXTAUTH_URL;
    const { requestPasswordReset } = await import("./password-reset-actions");
    const r = await requestPasswordReset(
      { error: null, message: null },
      form({ email: "user@hospital.org" })
    );
    expect(r.error).toMatch(/NEXTAUTH_URL/i);
  });

  it("respuesta genérica si no hay usuario activo", async () => {
    db.user.findFirst.mockResolvedValueOnce(null);
    const { requestPasswordReset } = await import("./password-reset-actions");
    const r = await requestPasswordReset(
      { error: null, message: null },
      form({ email: "nadie@hospital.org" })
    );
    expect(r.error).toBeNull();
    expect(r.message).toContain("Si existe una cuenta");
    expect(mail.sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it("respuesta genérica si supera límite de solicitudes por hora", async () => {
    db.user.findFirst.mockResolvedValueOnce({
      id: "u1",
      email: "User@Hospital.org",
    });
    db.passwordResetToken.count.mockResolvedValueOnce(5);
    const { requestPasswordReset } = await import("./password-reset-actions");
    const r = await requestPasswordReset(
      { error: null, message: null },
      form({ email: "user@hospital.org" })
    );
    expect(r.message).toContain("Si existe una cuenta");
    expect(db.passwordResetToken.create).not.toHaveBeenCalled();
  });

  it("crea token, envía correo y devuelve mensaje genérico", async () => {
    db.user.findFirst.mockResolvedValueOnce({
      id: "u1",
      email: "User@Hospital.org",
    });
    db.passwordResetToken.count.mockResolvedValueOnce(0);
    db.passwordResetToken.create.mockResolvedValueOnce({ id: "tok-row-1" });

    const { requestPasswordReset } = await import("./password-reset-actions");
    const r = await requestPasswordReset(
      { error: null, message: null },
      form({ email: "USER@hospital.org" })
    );

    expect(r.error).toBeNull();
    expect(r.message).toContain("Si existe una cuenta");
    expect(db.user.findFirst).toHaveBeenCalledWith({
      where: {
        email: { equals: "user@hospital.org", mode: "insensitive" },
        active: true,
      },
      select: { id: true, email: true },
    });
    expect(db.passwordResetToken.create).toHaveBeenCalledTimes(1);
    expect(mail.sendPasswordResetEmail).toHaveBeenCalledTimes(1);
    const [to, url] = mail.sendPasswordResetEmail.mock.calls[0]!;
    expect(to).toBe("User@Hospital.org");
    expect(url).toMatch(/^http:\/\/localhost:3000\/login\/reset\?token=/);
    const u = new URL(url);
    expect(u.searchParams.get("token")).toBeTruthy();
    expect(u.searchParams.get("token")!.length).toBeGreaterThanOrEqual(32);
  });

  it("si el envío falla, borra el token y devuelve error", async () => {
    const errLog = vi.spyOn(console, "error").mockImplementation(() => {});
    db.user.findFirst.mockResolvedValueOnce({ id: "u1", email: "a@b.co" });
    db.passwordResetToken.count.mockResolvedValueOnce(0);
    db.passwordResetToken.create.mockResolvedValueOnce({ id: "row-del" });
    mail.sendPasswordResetEmail.mockRejectedValueOnce(new Error("SMTP down"));

    const { requestPasswordReset } = await import("./password-reset-actions");
    const r = await requestPasswordReset(
      { error: null, message: null },
      form({ email: "a@b.co" })
    );

    expect(r.message).toBeNull();
    expect(r.error).toMatch(/No se ha podido enviar/i);
    expect(db.passwordResetToken.delete).toHaveBeenCalledWith({
      where: { id: "row-del" },
    });
    errLog.mockRestore();
  });
});

describe("completePasswordReset", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.$transaction.mockImplementation(async (ops: Array<Promise<unknown>>) => {
      await Promise.all(ops);
    });
  });

  it("rechaza token vacío", async () => {
    const { completePasswordReset } = await import("./password-reset-actions");
    const r = await completePasswordReset(
      { error: null, ok: false },
      form({ token: "", password: "12345678", confirm: "12345678" })
    );
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/enlace|Falta/i);
  });

  it("rechaza contraseña corta o confirmación distinta", async () => {
    const { completePasswordReset } = await import("./password-reset-actions");
    const short = await completePasswordReset(
      { error: null, ok: false },
      form({ token: "abcdabcdabcdabcdabcdabcdabcdabcd", password: "short", confirm: "short" })
    );
    expect(short.error).toMatch(/8 caracteres/i);

    const mismatch = await completePasswordReset(
      { error: null, ok: false },
      form({
        token: "abcdabcdabcdabcdabcdabcdabcdabcd",
        password: "12345678",
        confirm: "87654321",
      })
    );
    expect(mismatch.error).toMatch(/coincide/i);
  });

  it("rechaza token inválido o caducado", async () => {
    db.passwordResetToken.findFirst.mockResolvedValueOnce(null);
    const raw = randomBytes(8).toString("hex");
    const { completePasswordReset } = await import("./password-reset-actions");
    const r = await completePasswordReset(
      { error: null, ok: false },
      form({ token: raw, password: "12345678", confirm: "12345678" })
    );
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/caducado|válido|Solicita/i);
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("hashea contraseña y ejecuta transacción (update + deleteMany)", async () => {
    const raw = randomBytes(16).toString("hex");
    const tokenHash = createHash("sha256").update(raw).digest("hex");
    db.passwordResetToken.findFirst.mockResolvedValueOnce({
      id: "pr-1",
      userId: "user-99",
      tokenHash,
      expiresAt: new Date(Date.now() + 60_000),
      usedAt: null,
    });

    const { completePasswordReset } = await import("./password-reset-actions");
    const r = await completePasswordReset(
      { error: null, ok: false },
      form({ token: raw, password: "nuevaClave8", confirm: "nuevaClave8" })
    );

    expect(r.ok).toBe(true);
    expect(r.error).toBeNull();
    expect(db.$transaction).toHaveBeenCalledTimes(1);
    const ops = db.$transaction.mock.calls[0]![0] as Array<Promise<unknown>>;
    expect(Array.isArray(ops)).toBe(true);
    expect(ops).toHaveLength(2);
    await Promise.all(ops);

    expect(db.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "user-99" },
        data: expect.objectContaining({
          password: expect.any(String),
        }),
      })
    );
    const hashArg = (db.user.update.mock.calls[0]![0] as { data: { password: string } }).data
      .password;
    expect(hashArg).not.toBe("nuevaClave8");
    expect(hashArg.length).toBeGreaterThan(20);

    expect(db.passwordResetToken.deleteMany).toHaveBeenCalledWith({
      where: { userId: "user-99" },
    });
  });
});
