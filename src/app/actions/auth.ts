"use server";

import { redirect } from "next/navigation";
import { ROLES } from "@/lib/constants";
import { AppError } from "@/lib/errors";
import { rateLimit, resetRateLimit } from "@/lib/security/rate-limit";
import { emailSchema, fieldErrors, registerSchema } from "@/lib/validation";
import { authenticate, registerPatient, requestPasswordReset, resetPasswordWithToken } from "@/server/services/accounts";
import { audit } from "@/server/services/audit";
import { clientIp, createSession, destroySession, getCurrentUser } from "@/server/session";
import type { ActionState } from "@/components/ui/forms";

export async function registerAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const ip = await clientIp();
  if (!rateLimit(`register:${ip}`, 10, 60 * 60 * 1000).ok) return { error: "Muitas tentativas. Tente novamente mais tarde." };
  const raw = Object.fromEntries(fd) as Record<string, string>;
  const parsed = registerSchema.safeParse(raw);
  const keep = { fullName: raw.fullName ?? "", preferredName: raw.preferredName ?? "", email: raw.email ?? "" };
  if (!parsed.success) return { error: "Revise os campos destacados.", fieldErrors: fieldErrors(parsed.error), data: keep };
  try {
    const { user } = await registerPatient(parsed.data);
    await createSession(user.id);
  } catch (e) {
    if (e instanceof AppError) return { error: e.message, data: keep, fieldErrors: e.code === "DUPLICATE_EMAIL" ? { email: e.message } : {} };
    throw e;
  }
  redirect("/paciente/boas-vindas");
}

async function doLogin(fd: FormData, expected: string): Promise<ActionState | null> {
  const email = String(fd.get("email") ?? "");
  const password = String(fd.get("password") ?? "");
  const ip = await clientIp();
  const key = `login:${ip}:${email.toLowerCase()}`;
  const rl = rateLimit(key, 8, 15 * 60 * 1000);
  if (!rl.ok) return { error: `Muitas tentativas. Aguarde ${Math.ceil(rl.retryAfterSec / 60)} minuto(s) e tente novamente.`, data: { email } };
  if (!emailSchema.safeParse(email).success || !password) return { error: "Informe e-mail e senha.", data: { email } };
  const user = await authenticate(email, password);
  if (!user || user.role !== expected) {
    await audit({ actorId: null, action: expected === ROLES.ADMIN ? "ADMIN_LOGIN_FAILED" : "LOGIN_FAILED", entityType: "User", details: { ip } });
    return { error: "E-mail ou senha incorretos.", data: { email } };
  }
  resetRateLimit(key);
  await createSession(user.id);
  if (expected === ROLES.ADMIN) await audit({ actorId: user.id, action: "ADMIN_LOGIN", entityType: "User", entityId: user.id, details: { ip } });
  return null;
}

export async function loginAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const err = await doLogin(fd, ROLES.PATIENT);
  if (err) return err;
  const next = String(fd.get("next") ?? "");
  redirect(next.startsWith("/paciente") ? next : "/paciente");
}

export async function adminLoginAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const err = await doLogin(fd, ROLES.ADMIN);
  if (err) return err;
  redirect("/admin");
}

export async function logoutAction() {
  const u = await getCurrentUser();
  await destroySession();
  redirect(u?.role === ROLES.ADMIN ? "/acesso-profissional" : "/entrar");
}

export async function forgotPasswordAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const ip = await clientIp();
  if (!rateLimit(`forgot:${ip}`, 5, 60 * 60 * 1000).ok) return { error: "Muitas solicitações. Tente novamente mais tarde." };
  const email = emailSchema.safeParse(String(fd.get("email") ?? ""));
  if (!email.success) return { error: "Informe um e-mail válido." };
  await requestPasswordReset(email.data);
  return {
    ok: true,
    message:
      "Pedido registrado. Se houver uma conta com este e-mail, a profissional receberá o aviso e enviará a você um link pessoal para criar uma nova senha.",
  };
}

export async function resetPasswordAction(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    await resetPasswordWithToken(String(fd.get("token") ?? ""), String(fd.get("password") ?? ""), String(fd.get("confirmPassword") ?? ""));
  } catch (e) {
    if (e instanceof AppError) return { error: e.message };
    throw e;
  }
  redirect("/entrar?senha=redefinida");
}
