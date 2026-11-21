/**
 * Redefine a senha da conta administrativa (acesso ao servidor necessário).
 * Uso: ADMIN_PASSWORD="nova-senha-forte" npm run admin:reset-password
 */
import { prisma } from "../src/lib/db";
import bcrypt from "bcryptjs";
import { validatePasswordStrength } from "../src/lib/security/password";


async function main() {
  const password = process.env.ADMIN_PASSWORD || "";
  const pwErr = validatePasswordStrength(password);
  if (pwErr) throw new Error(`ADMIN_PASSWORD: ${pwErr}`);
  if (password.length < 12) throw new Error("Use pelo menos 12 caracteres.");
  const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  if (!admin) throw new Error("Nenhuma conta administrativa encontrada. Use npm run admin:create.");
  await prisma.$transaction([
    prisma.user.update({ where: { id: admin.id }, data: { passwordHash: await bcrypt.hash(password, 12) } }),
    prisma.session.deleteMany({ where: { userId: admin.id } }),
    prisma.auditLog.create({ data: { actorId: admin.id, action: "ADMIN_PASSWORD_RESET_CLI", entityType: "User", entityId: admin.id } }),
  ]);
  console.log("✓ Senha administrativa redefinida. Todas as sessões foram encerradas.");
}

main()
  .catch((e) => {
    console.error("✗", e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
