import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { registerSchema } from "@/lib/validation";
import {
  authenticate, createPasswordResetToken, registerPatient, requestPasswordReset, resetPasswordWithToken,
} from "@/server/services/accounts";
import { ensureAdmin, uniqueEmail } from "./helpers";

beforeAll(async () => {
  await ensureAdmin();
});

describe("cadastro e autenticação", () => {
  it("valida o formato do e-mail e a confirmação de senha", () => {
    const base = { fullName: "Ana Teste", preferredName: "Ana", password: "abc12345", confirmPassword: "abc12345", consent: "on" };
    expect(registerSchema.safeParse({ ...base, email: "invalido" }).success).toBe(false);
    expect(registerSchema.safeParse({ ...base, email: "ok@exemplo.test", confirmPassword: "x" }).success).toBe(false);
    expect(registerSchema.safeParse({ ...base, email: "ok@exemplo.test", consent: undefined }).success).toBe(false);
    expect(registerSchema.safeParse({ ...base, email: "OK@Exemplo.test" }).success).toBe(true);
  });

  it("cria conta, ficha da paciente, primeira anamnese e notifica a profissional", async () => {
    const admin = await ensureAdmin();
    const email = uniqueEmail();
    const { patient, anamnesis, user } = await registerPatient({ fullName: "Joana Fictícia", preferredName: "Jo", email, password: "senhaSegura1" });
    expect(user.passwordHash).not.toContain("senhaSegura1");
    expect(user.passwordHash.startsWith("$2")).toBe(true);
    expect(patient.preferredName).toBe("Jo");
    expect(anamnesis.sequence).toBe(1);
    expect(anamnesis.isFirst).toBe(true);
    expect(anamnesis.dueAt).toBeNull();
    const n = await prisma.notification.findFirst({ where: { userId: admin.id, type: "NEW_PATIENT", link: `/admin/pacientes/${patient.id}` } });
    expect(n).not.toBeNull();
    const pn = await prisma.notification.findFirst({ where: { userId: user.id, type: "FIRST_ANAMNESIS" } });
    expect(pn).not.toBeNull();
  });

  it("impede e-mails duplicados (sem diferenciar maiúsculas)", async () => {
    const email = uniqueEmail();
    await registerPatient({ fullName: "Clara Fictícia", preferredName: "Clara", email, password: "senhaSegura1" });
    await expect(
      registerPatient({ fullName: "Outra", preferredName: "Outra", email: email.toUpperCase(), password: "senhaSegura1" }),
    ).rejects.toThrow(/Já existe uma conta/);
  });

  it("exige senha forte", async () => {
    await expect(registerPatient({ fullName: "Fraca", preferredName: "F", email: uniqueEmail(), password: "123" })).rejects.toThrow();
  });

  it("autentica com a senha correta e recusa a incorreta", async () => {
    const email = uniqueEmail();
    await registerPatient({ fullName: "Lia Fictícia", preferredName: "Lia", email, password: "senhaSegura1" });
    expect(await authenticate(email, "senhaSegura1")).not.toBeNull();
    expect(await authenticate(email, "errada123")).toBeNull();
    expect(await authenticate("naoexiste@exemplo.test", "senhaSegura1")).toBeNull();
  });

  it("recuperação de senha: pedido notifica a profissional e o link é de uso único", async () => {
    const admin = await ensureAdmin();
    const email = uniqueEmail();
    const { patient } = await registerPatient({ fullName: "Bia Fictícia", preferredName: "Bia", email, password: "senhaSegura1" });
    await requestPasswordReset(email);
    expect(await prisma.notification.findFirst({ where: { userId: admin.id, type: "PASSWORD_RESET_REQUEST", link: `/admin/pacientes/${patient.id}` } })).not.toBeNull();
    const token = await createPasswordResetToken(admin.id, patient.id);
    await resetPasswordWithToken(token, "novaSenha99", "novaSenha99");
    expect(await authenticate(email, "novaSenha99")).not.toBeNull();
    expect(await authenticate(email, "senhaSegura1")).toBeNull();
    await expect(resetPasswordWithToken(token, "outraSenha99", "outraSenha99")).rejects.toThrow(/inválido ou expirou/);
  });
});
