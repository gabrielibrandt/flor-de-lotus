/**
 * Provisionamento da ÚNICA conta administrativa.
 * Uso: ADMIN_EMAIL=... ADMIN_PASSWORD=... ADMIN_NAME="..." npm run admin:create
 * (ou preencha as variáveis no .env e remova-as depois).
 */
import { prisma } from "../src/lib/db";
import bcrypt from "bcryptjs";
import { validatePasswordStrength } from "../src/lib/security/password";


async function main() {
  const email = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "";
  const name = (process.env.ADMIN_NAME || "Profissional Flor de Lótus").trim();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Defina ADMIN_EMAIL com um e-mail válido.");
  const pwErr = validatePasswordStrength(password);
  if (pwErr) throw new Error(`ADMIN_PASSWORD: ${pwErr}`);
  if (password.length < 12) throw new Error("ADMIN_PASSWORD: para a conta administrativa use pelo menos 12 caracteres.");

  const existingAdmin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  if (existingAdmin) throw new Error(`Já existe uma conta administrativa (${existingAdmin.email}). O sistema permite somente uma.`);
  const taken = await prisma.user.findUnique({ where: { email } });
  if (taken) throw new Error("Este e-mail já está em uso por uma conta de paciente.");

  const user = await prisma.user.create({
    data: { email, name, role: "ADMIN", passwordHash: await bcrypt.hash(password, 12) },
  });
  await prisma.auditLog.create({ data: { actorId: user.id, action: "ADMIN_PROVISIONED", entityType: "User", entityId: user.id } });
  console.log(`✓ Conta administrativa criada para ${email}. Remova ADMIN_PASSWORD do ambiente.`);
}

main()
  .catch((e) => {
    console.error("✗", e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
