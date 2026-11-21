import { prisma } from "@/lib/db";
import { ANAMNESIS_STATUS, NEAR_DUE_HOURS } from "@/lib/constants";
import { fmtDateTime } from "@/lib/dates";
import { notifyAdmin, notifyUser } from "./notifications";

let lastRun = 0;

/**
 * Gera as notificações de prazo ("próxima do prazo" e "atrasada").
 * Idempotente: cada aviso é emitido uma única vez por anamnese.
 * Executada de forma oportunista ao carregar os painéis (no máximo 1x/minuto)
 * e também disponível como tarefa agendável: `npm run jobs:deadlines`.
 */
export async function sweepDeadlines(opts: { force?: boolean; now?: Date } = {}) {
  const now = opts.now ?? new Date();
  if (!opts.force && Date.now() - lastRun < 60_000) return { nearDue: 0, overdue: 0 };
  lastRun = Date.now();

  const open = { in: [ANAMNESIS_STATUS.NOT_STARTED, ANAMNESIS_STATUS.IN_PROGRESS] };
  const soon = new Date(now.getTime() + NEAR_DUE_HOURS * 3600 * 1000);
  let nearDue = 0;
  let overdue = 0;

  const nearList = await prisma.anamnesis.findMany({
    where: { status: open, nearDueNotifiedAt: null, overdueNotifiedAt: null, dueAt: { gt: now, lte: soon } },
    include: { patient: true },
  });
  for (const a of nearList) {
    const claimed = await prisma.anamnesis.updateMany({ where: { id: a.id, nearDueNotifiedAt: null }, data: { nearDueNotifiedAt: now } });
    if (claimed.count !== 1) continue;
    nearDue++;
    await notifyUser(a.patient.userId, {
      type: "DEADLINE",
      title: "O prazo da sua anamnese está chegando",
      body: `Envie suas respostas até ${fmtDateTime(a.dueAt)}.`,
      link: `/paciente/anamneses/${a.id}`,
    });
    await notifyAdmin({
      type: "NEAR_DUE",
      title: "Anamnese próxima do prazo",
      body: `A anamnese nº ${a.sequence} de ${a.patient.fullName} vence em ${fmtDateTime(a.dueAt)}.`,
      link: `/admin/anamneses/${a.id}`,
    });
  }

  const lateList = await prisma.anamnesis.findMany({
    where: { status: open, overdueNotifiedAt: null, dueAt: { lte: now } },
    include: { patient: true },
  });
  for (const a of lateList) {
    const claimed = await prisma.anamnesis.updateMany({ where: { id: a.id, overdueNotifiedAt: null }, data: { overdueNotifiedAt: now } });
    if (claimed.count !== 1) continue;
    overdue++;
    await notifyAdmin({
      type: "OVERDUE",
      title: "Anamnese atrasada",
      body: `A anamnese nº ${a.sequence} de ${a.patient.fullName} não foi enviada até o prazo (${fmtDateTime(a.dueAt)}).`,
      link: `/admin/anamneses/${a.id}`,
    });
    await notifyUser(a.patient.userId, {
      type: "DEADLINE",
      title: "O prazo da sua anamnese passou",
      body: "Não se preocupe: você ainda pode enviar suas respostas.",
      link: `/paciente/anamneses/${a.id}`,
    });
  }
  return { nearDue, overdue };
}
