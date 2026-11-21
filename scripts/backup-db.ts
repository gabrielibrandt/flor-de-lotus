/**
 * Backup do banco SQLite (cópia consistente via VACUUM INTO) em ./backups.
 * Em produção com PostgreSQL, use pg_dump (ver README).
 */
import { prisma } from "../src/lib/db";
import fs from "node:fs";
import path from "node:path";


async function main() {
  const url = process.env.DATABASE_URL || "";
  if (!url.startsWith("file:")) {
    throw new Error("Este script atende apenas SQLite. Para PostgreSQL use: pg_dump \"$DATABASE_URL\" -Fc -f backup.dump");
  }
  const dir = path.resolve("backups");
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const file = path.join(dir, `flor-de-lotus-${stamp}.db`);
  await prisma.$executeRawUnsafe(`VACUUM INTO '${file.replace(/'/g, "''")}'`);
  fs.chmodSync(file, 0o600);
  console.log(`✓ Backup criado: ${file}`);
}

main()
  .catch((e) => {
    console.error("✗", e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
