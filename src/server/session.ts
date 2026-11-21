import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { prisma } from "@/lib/db";
import { ROLES, SESSION_COOKIE, SESSION_DAYS } from "@/lib/constants";
import { ForbiddenError } from "@/lib/errors";
import { generateToken, sha256 } from "@/lib/security/tokens";

const SESSION_MS = SESSION_DAYS * 24 * 3600 * 1000;

/** Cria sessão no banco e grava o cookie httpOnly. Apenas o hash do token é armazenado. */
export async function createSession(userId: string) {
  const token = generateToken();
  const ua = (await headers()).get("user-agent")?.slice(0, 300) ?? null;
  await prisma.session.create({
    data: { tokenHash: sha256(token), userId, expiresAt: new Date(Date.now() + SESSION_MS), userAgent: ua },
  });
  // limpeza oportunista de sessões expiradas
  await prisma.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MS / 1000,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await prisma.session.deleteMany({ where: { tokenHash: sha256(token) } });
  jar.delete(SESSION_COOKIE);
}

export type CurrentUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  patientId: string | null;
  preferredName: string | null;
};

/** Usuária autenticada da requisição atual (memoizada por requisição). */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { tokenHash: sha256(token) },
    include: { user: { include: { patient: { select: { id: true, preferredName: true } } } } },
  });
  if (!session || session.expiresAt < new Date() || !session.user.isActive) return null;
  // renovação deslizante, no máximo uma vez por hora
  if (Date.now() - session.lastSeenAt.getTime() > 3600 * 1000) {
    await prisma.session.update({
      where: { id: session.id },
      data: { lastSeenAt: new Date(), expiresAt: new Date(Date.now() + SESSION_MS) },
    });
  }
  const u = session.user;
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    patientId: u.patient?.id ?? null,
    preferredName: u.patient?.preferredName ?? null,
  };
});

/** Para páginas: redireciona ao login quando não autenticada. */
export async function requireAdminPage(): Promise<CurrentUser> {
  const u = await getCurrentUser();
  if (!u) redirect("/acesso-profissional");
  if (u.role !== ROLES.ADMIN) redirect("/paciente");
  return u;
}

export async function requirePatientPage(): Promise<CurrentUser & { patientId: string }> {
  const u = await getCurrentUser();
  if (!u) redirect("/entrar");
  if (u.role !== ROLES.PATIENT || !u.patientId) redirect("/admin");
  return u as CurrentUser & { patientId: string };
}

/** Para ações de servidor e rotas: lança erro em vez de redirecionar. */
export async function requireAdmin(): Promise<CurrentUser> {
  const u = await getCurrentUser();
  if (!u || u.role !== ROLES.ADMIN) throw new ForbiddenError();
  return u;
}

export async function requirePatient(): Promise<CurrentUser & { patientId: string }> {
  const u = await getCurrentUser();
  if (!u || u.role !== ROLES.PATIENT || !u.patientId) throw new ForbiddenError();
  return u as CurrentUser & { patientId: string };
}

export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
}
