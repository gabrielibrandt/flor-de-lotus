import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

/** Cria um banco SQLite de teste novo aplicando as migrações versionadas. */
export default async function setup() {
  const file = path.resolve("test.db");
  for (const f of [file, `${file}-journal`, `${file}-wal`, `${file}-shm`]) if (fs.existsSync(f)) fs.rmSync(f);
  const db = new Database(file);
  const dir = path.resolve("prisma/migrations");
  for (const m of fs.readdirSync(dir).filter((d) => /^\d/.test(d)).sort()) {
    db.exec(fs.readFileSync(path.join(dir, m, "migration.sql"), "utf8"));
  }
  db.close();
  process.env.DATABASE_URL = "file:./test.db";
  const { seedQuestions } = await import("../prisma/seed");
  await seedQuestions();
}
