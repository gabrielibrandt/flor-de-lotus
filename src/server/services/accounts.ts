import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { PRIVACY_VERSION, RESET_TOKEN_HOURS, ROLES } from "@/lib/constants";
import { AppError, NotFoundError } from "@/lib/errors";
import { DUMMY_HASH, hashPassword, validatePasswordStrength, verifyPassword } from "@/lib/security/password";
import { generateToken, sha256 } from "@/lib/security/tokens";
import { audit } from "./audit";
import { notifyAdmin, notifyUser } from "./notifications";

export type RegisterInput = { fullName: string; preferredName: string; email: string; password: string };

/**
 * Cadastro público de paciente. Cria a conta, a ficha da paciente e a primeira anamnese
 * (disponível imediatamente, sem prazo até que a profissional vincule uma consulta).
 */
export async function registerPatient(input: RegisterInput) {
  const email = input.email.trim().toLowerCase();
  const pwError = validatePasswordStrength(input.password);
  if (pwError) throw new AppError(pwError);

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) throw new AppError("Já existe uma conta com este e-mail. Tente entrar ou recuperar a senha.", "DUPLICATE_EMAIL");

  const passwordHash = await hashPassword(input.password);
  try {
    return await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email, passwordHash, role: ROLES.PATIENT, name: input.fullName.trim() },
      });
      const patient = await tx.patient.create({
        data: {
          userId: user.id,
          fullName: input.fullName.trim(),
          preferredName: input.preferredName.trim(),
          consentAt: new Date(),
          privacyVersion: PRIVACY_VERSION,
        },
      });
      const anamnesis = await tx.anamnesis.create({
        data: { patientId: patient.id, sequence: 1, isFirst: true },
      });
      await notifyAdmin(
        {
          type: "NEW_PATIENT",
          title: "Nova paciente cadastrada",
          body: `${patient.fullName} (${patient.preferredName}) criou uma conta.`,
          link: `/admin/pacientes/${patient.id}`,
        },
        tx,
      );
      await notifyUser(
        user.id,
        {
          type: "FIRST_ANAMNESIS",
          title: "Sua primeira anamnese está disponível",
          body: "Separe um momento tranquilo do seu dia para respondê-la com atenção e carinho.",
          link: `/paciente/anamneses/${anamnesis.id}`,
        },
        tx,
      );
      await audit({ actorId: user.id, action: "PATIENT_REGISTERED", entityType: "Patient", entityId: patient.id, details: { privacyVersion: PRIVACY_VERSION } }, tx);
      return { user, patient, anamnesis };
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new AppError("Já existe uma conta com este e-mail. Tente entrar ou recuperar a senha.", "DUPLICATE_EMAIL");
    }
    throw e;
  }
}

/** Verifica credenciais. Tempo de resposta equalizado para não revelar se o e-mail existe. */
export async function authenticate(emailRaw: string, password: string) {
  const email = emailRaw.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });
  const ok = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok || !user.isActive) return null;
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  return user;
}

export async function changePassword(userId: string, current: string, next: string, confirm: string) {
  if (next !== confirm) throw new AppError("As senhas não coincidem.");
  const pwError = validatePasswordStrength(next);
  if (pwError) throw new AppError(pwError);
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError();
  if (!(await verifyPassword(current, user.passwordHash))) throw new AppError("A senha atual está incorreta.");
  await prisma.user.update({ where: { id: userId }, data: { passwordHash: await hashPassword(next) } });
  await audit({ actorId: userId, action: "PASSWORD_CHANGED", entityType: "User", entityId: userId });
}

export async function updatePatientProfile(userId: string, data: { fullName: string; preferredName: string; email: string }) {
  const patient = await prisma.patient.findUnique({ where: { userId }, include: { user: true } });
  if (!patient) throw new NotFoundError();
  const email = data.email.trim().toLowerCase();
  if (email !== patient.user.email) {
    const taken = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (taken) throw new AppError("Este e-mail já está em uso por outra conta.");
  }
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { email, name: data.fullName } }),
    prisma.patient.update({ where: { id: patient.id }, data: { fullName: data.fullName, preferredName: data.preferredName } }),
  ]);
  await audit({
    actorId: userId,
    action: "PROFILE_UPDATED",
    entityType: "Patient",
    entityId: patient.id,
    details: { emailChanged: email !== patient.user.email },
  });
}

/**
 * Recuperação de senha sem e-mail automático: a paciente registra o pedido,
 * a profissional recebe uma notificação e gera um link de uso único para enviar a ela.
 * A resposta é sempre a mesma, exista ou não a conta.
 */
export async function requestPasswordReset(emailRaw: string) {
  const email = emailRaw.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email }, include: { patient: true } });
  if (!user || user.role !== ROLES.PATIENT || !user.patient) return;
  const last = user.patient.passwordResetRequestedAt;
  if (last && Date.now() - last.getTime() < 10 * 60 * 1000) return; // evita spam
  await prisma.patient.update({ where: { id: user.patient.id }, data: { passwordResetRequestedAt: new Date() } });
  await notifyAdmin({
    type: "PASSWORD_RESET_REQUEST",
    title: "Pedido de redefinição de senha",
    body: `${user.patient.fullName} pediu ajuda para redefinir a senha. Gere um link na ficha da paciente.`,
    link: `/admin/pacientes/${user.patient.id}`,
  });
  await audit({ actorId: null, action: "PASSWORD_RESET_REQUESTED", entityType: "User", entityId: user.id });
}

/** Gera link de redefinição (válido por 24h, uso único). Retorna o token em texto puro apenas uma vez. */
export async function createPasswordResetToken(adminId: string, patientId: string) {
  const patient = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!patient) throw new NotFoundError("Paciente não encontrada.");
  const token = generateToken();
  await prisma.$transaction([
    // invalida links anteriores ainda não usados
    prisma.passwordResetToken.updateMany({ where: { userId: patient.userId, usedAt: null }, data: { usedAt: new Date() } }),
    prisma.passwordResetToken.create({
      data: {
        tokenHash: sha256(token),
        userId: patient.userId,
        expiresAt: new Date(Date.now() + RESET_TOKEN_HOURS * 3600 * 1000),
        createdById: adminId,
      },
    }),
    prisma.patient.update({ where: { id: patientId }, data: { passwordResetRequestedAt: null } }),
  ]);
  await audit({ actorId: adminId, action: "PASSWORD_RESET_LINK_CREATED", entityType: "Patient", entityId: patientId });
  return token;
}

export async function findValidResetToken(token: string) {
  const rec = await prisma.passwordResetToken.findUnique({ where: { tokenHash: sha256(token) } });
  if (!rec || rec.usedAt || rec.expiresAt < new Date()) return null;
  return rec;
}

export async function resetPasswordWithToken(token: string, password: string, confirm: string) {
  if (password !== confirm) throw new AppError("As senhas não coincidem.");
  const pwError = validatePasswordStrength(password);
  if (pwError) throw new AppError(pwError);
  const rec = await findValidResetToken(token);
  if (!rec) throw new AppError("Este link é inválido ou expirou. Peça um novo link à profissional.");
  const passwordHash = await hashPassword(password);
  await prisma.$transaction([
    prisma.user.update({ where: { id: rec.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { id: rec.id }, data: { usedAt: new Date() } }),
    prisma.session.deleteMany({ where: { userId: rec.userId } }),
  ]);
  await audit({ actorId: rec.userId, action: "PASSWORD_RESET_COMPLETED", entityType: "User", entityId: rec.userId });
}
