/** Tarefa agendável (ex.: cron a cada 15 min) para avisos de prazo. */
import { sweepDeadlines } from "../src/server/services/deadlines";
import { prisma } from "../src/lib/db";

sweepDeadlines({ force: true })
  .then((r) => console.log(`✓ Avisos: ${r.nearDue} próximos do prazo, ${r.overdue} atrasadas.`))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
