import { prisma } from "@/lib/db";
import { ANAMNESIS_STATUS } from "@/lib/constants";
import { AppError, NotFoundError } from "@/lib/errors";
import { computeDueAt, fmtDateTime, parseLocalDateTime } from "@/lib/dates";
import { isAnswered, isSkipAllowed, normalizeAnswerValue } from "@/lib/answers";
import { isSubmitted } from "@/lib/status";
import { audit } from "./audit";
import { notifyAdmin, notifyUser } from "./notifications";

export function getQuestions() {
  return prisma.question.findMany({ where: { isActive: true }, orderBy: { number: "asc" } });
}

/** Busca uma anamnese garantindo que pertence à paciente. Não revela a existência de registros alheios. */
export async function getPatientAnamnesis(patientId: string, anamnesisId: string) {
  const a = await prisma.anamnesis.findFirst({
    where: { id: anamnesisId, patientId },
    include: { answers: true },
  });
  if (!a) throw new NotFoundError("Anamnese não encontrada.");
  return a;
}

export type AnswerInput = { questionId: string; value: unknown; skipReason?: string | null };

/** Salvamento automático de respostas (somente enquanto a anamnese não foi enviada). */
export async function saveAnswers(patientId: string, anamnesisId: string, items: AnswerInput[]) {
  if (!items.length) return { savedAt: new Date() };
  if (items.length > 40) throw new AppError("Envio de respostas inválido.");
  const anamnesis = await getPatientAnamnesis(patientId, anamnesisId);
  if (isSubmitted(anamnesis)) {
    throw new AppError("Esta anamnese já foi enviada e não pode mais ser editada. Se encontrou algum erro, solicite uma correção.", "LOCKED");
  }
  const questions = await getQuestions();
  const byId = new Map(questions.map((q) => [q.id, q]));
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    for (const item of items) {
      const q = byId.get(item.questionId);
      if (!q) throw new AppError("Pergunta inválida.");
      const skip = item.skipReason ? item.skipReason : null;
      if (skip && !isSkipAllowed(q, skip)) throw new AppError("Opção não disponível para esta pergunta.");
      const value = normalizeAnswerValue(q, item.value);
      await tx.answer.upsert({
        where: { anamnesisId_questionId: { anamnesisId, questionId: q.id } },
        create: { anamnesisId, questionId: q.id, value, skipReason: skip },
        update: { value, skipReason: skip },
      });
    }
    // trava otimista: só atualiza se ainda não foi enviada (evita corrida com o envio)
    const res = await tx.anamnesis.updateMany({
      where: { id: anamnesisId, status: { in: [ANAMNESIS_STATUS.NOT_STARTED, ANAMNESIS_STATUS.IN_PROGRESS] } },
      data: {
        status: ANAMNESIS_STATUS.IN_PROGRESS,
        lastSavedAt: now,
        ...(anamnesis.startedAt ? {} : { startedAt: now }),
      },
    });
    if (res.count !== 1) throw new AppError("Esta anamnese já foi enviada e não pode mais ser editada.", "LOCKED");
  });
  return { savedAt: now };
}

export async function missingRequired(anamnesisId: string) {
  const [questions, answers] = await Promise.all([
    getQuestions(),
    prisma.answer.findMany({ where: { anamnesisId } }),
  ]);
  const byQ = new Map(answers.map((a) => [a.questionId, a]));
  return questions.filter((q) => q.required && !isAnswered(q, byQ.get(q.id))).map((q) => q.number);
}

/** Envio definitivo. Permitido mesmo após o prazo (marca como "fora do prazo"). */
export async function submitAnamnesis(patientId: string, anamnesisId: string) {
  const anamnesis = await getPatientAnamnesis(patientId, anamnesisId);
  if (isSubmitted(anamnesis)) throw new AppError("Esta anamnese já foi enviada.", "LOCKED");
  const missing = await missingRequired(anamnesisId);
  if (missing.length) {
    throw new AppError(`Ainda faltam respostas obrigatórias: pergunta${missing.length > 1 ? "s" : ""} ${missing.join(", ")}.`, "INCOMPLETE");
  }
  const now = new Date();
  const late = !!anamnesis.dueAt && now.getTime() > anamnesis.dueAt.getTime();
  const patient = await prisma.patient.findUniqueOrThrow({ where: { id: patientId } });

  await prisma.$transaction(async (tx) => {
    const res = await tx.anamnesis.updateMany({
      where: { id: anamnesisId, patientId, status: { in: [ANAMNESIS_STATUS.NOT_STARTED, ANAMNESIS_STATUS.IN_PROGRESS] } },
      data: { status: ANAMNESIS_STATUS.SUBMITTED, submittedAt: now, submittedLate: late, startedAt: anamnesis.startedAt ?? now },
    });
    if (res.count !== 1) throw new AppError("Esta anamnese já foi enviada.", "LOCKED");
    await notifyAdmin(
      {
        type: late ? "ANAMNESIS_SUBMITTED_LATE" : "ANAMNESIS_SUBMITTED",
        title: late ? "Anamnese enviada fora do prazo" : "Nova anamnese enviada",
        body: late
          ? `${patient.fullName} enviou a anamnese nº ${anamnesis.sequence} após o prazo (${fmtDateTime(anamnesis.dueAt)}).`
          : `${patient.fullName} enviou a anamnese nº ${anamnesis.sequence}.`,
        link: `/admin/anamneses/${anamnesisId}`,
      },
      tx,
    );
    await notifyUser(
      patient.userId,
      {
        type: "SUBMISSION_CONFIRMED",
        title: "Anamnese enviada com sucesso",
        body: "Recebemos suas respostas. Obrigada pela dedicação!",
        link: `/paciente/anamneses/${anamnesisId}`,
      },
      tx,
    );
    await audit({ actorId: patient.userId, action: "ANAMNESIS_SUBMITTED", entityType: "Anamnesis", entityId: anamnesisId, details: { late } }, tx);
  });
  return { late };
}

export type ReleaseInput = {
  patientId: string;
  date: string;
  time: string;
  appointmentId?: string | null;
  addToAgenda?: boolean;
};

/** Liberação de nova anamnese pela profissional. Nunca sobrescreve registros anteriores. */
export async function releaseAnamnesis(adminId: string, input: ReleaseInput) {
  const patient = await prisma.patient.findUnique({ where: { id: input.patientId } });
  if (!patient) throw new NotFoundError("Paciente não encontrada.");
  let consultationAt: Date;
  try {
    consultationAt = parseLocalDateTime(input.date, input.time);
  } catch {
    throw new AppError("Data ou horário da consulta inválido.");
  }
  const dueAt = computeDueAt(consultationAt);

  return prisma.$transaction(async (tx) => {
    let appointmentId: string | null = null;
    if (input.appointmentId) {
      const appt = await tx.appointment.findUnique({ where: { id: input.appointmentId }, include: { anamnesis: true } });
      if (!appt || appt.patientId !== patient.id) throw new AppError("Compromisso inválido para esta paciente.");
      if (appt.anamnesis) throw new AppError("Este compromisso já possui uma anamnese vinculada.");
      appointmentId = appt.id;
    } else if (input.addToAgenda) {
      const appt = await tx.appointment.create({
        data: { title: `Consulta — ${patient.preferredName}`, startsAt: consultationAt, durationMin: 60, patientId: patient.id },
      });
      appointmentId = appt.id;
    }
    const last = await tx.anamnesis.aggregate({ where: { patientId: patient.id }, _max: { sequence: true } });
    const sequence = (last._max.sequence ?? 0) + 1;
    const anamnesis = await tx.anamnesis.create({
      data: { patientId: patient.id, sequence, consultationAt, dueAt, appointmentId, releasedById: adminId },
    });
    await notifyUser(
      patient.userId,
      {
        type: "NEW_ANAMNESIS",
        title: "Nova anamnese disponível",
        body: `Sua consulta está marcada para ${fmtDateTime(consultationAt)}. Envie a anamnese até ${fmtDateTime(dueAt)}.`,
        link: `/paciente/anamneses/${anamnesis.id}`,
      },
      tx,
    );
    await audit(
      { actorId: adminId, action: "ANAMNESIS_RELEASED", entityType: "Anamnesis", entityId: anamnesis.id, details: { patientId: patient.id, sequence, consultationAt, dueAt } },
      tx,
    );
    return anamnesis;
  });
}

/** Vincula/atualiza a data da consulta de uma anamnese ainda não enviada (ex.: a primeira). */
export async function setConsultation(adminId: string, anamnesisId: string, date: string, time: string, addToAgenda: boolean) {
  const a = await prisma.anamnesis.findUnique({ where: { id: anamnesisId }, include: { patient: true } });
  if (!a) throw new NotFoundError();
  if (isSubmitted(a)) throw new AppError("Não é possível alterar o prazo de uma anamnese já enviada.");
  let consultationAt: Date;
  try {
    consultationAt = parseLocalDateTime(date, time);
  } catch {
    throw new AppError("Data ou horário da consulta inválido.");
  }
  const dueAt = computeDueAt(consultationAt);
  await prisma.$transaction(async (tx) => {
    let appointmentId = a.appointmentId;
    if (appointmentId) {
      await tx.appointment.update({ where: { id: appointmentId }, data: { startsAt: consultationAt } });
    } else if (addToAgenda) {
      const appt = await tx.appointment.create({
        data: { title: `Consulta — ${a.patient.preferredName}`, startsAt: consultationAt, durationMin: 60, patientId: a.patientId },
      });
      appointmentId = appt.id;
    }
    await tx.anamnesis.update({
      where: { id: a.id },
      data: { consultationAt, dueAt, appointmentId, nearDueNotifiedAt: null, overdueNotifiedAt: null },
    });
    await notifyUser(
      a.patient.userId,
      {
        type: "DEADLINE",
        title: "Prazo de envio da anamnese",
        body: `Sua consulta está marcada para ${fmtDateTime(consultationAt)}. Envie a anamnese até ${fmtDateTime(dueAt)}.`,
        link: `/paciente/anamneses/${a.id}`,
      },
      tx,
    );
    await audit({ actorId: adminId, action: "CONSULTATION_SET", entityType: "Anamnesis", entityId: a.id, details: { consultationAt, dueAt } }, tx);
  });
}

export async function markReviewed(adminId: string, anamnesisId: string) {
  const res = await prisma.anamnesis.updateMany({
    where: { id: anamnesisId, status: ANAMNESIS_STATUS.SUBMITTED },
    data: { status: ANAMNESIS_STATUS.REVIEWED, reviewedAt: new Date() },
  });
  if (res.count !== 1) throw new AppError("Somente anamneses enviadas podem ser marcadas como revisadas.");
  await audit({ actorId: adminId, action: "ANAMNESIS_REVIEWED", entityType: "Anamnesis", entityId: anamnesisId });
}

export async function markViewedByAdmin(anamnesisId: string) {
  await prisma.anamnesis.updateMany({
    where: { id: anamnesisId, adminViewedAt: null, status: { in: [ANAMNESIS_STATUS.SUBMITTED, ANAMNESIS_STATUS.REVIEWED] } },
    data: { adminViewedAt: new Date() },
  });
}

/**
 * Correção feita pela profissional em uma anamnese enviada.
 * A resposta anterior é preservada em AnswerRevision (nunca sobrescrita silenciosamente).
 */
export async function correctAnswer(
  adminId: string,
  input: { anamnesisId: string; questionId: string; value: unknown; skipReason?: string | null; reason: string; correctionRequestId?: string | null },
) {
  const reason = input.reason.trim();
  if (reason.length < 3) throw new AppError("Descreva o motivo da correção.");
  const a = await prisma.anamnesis.findUnique({ where: { id: input.anamnesisId } });
  if (!a) throw new NotFoundError();
  if (!isSubmitted(a)) throw new AppError("A paciente ainda pode editar esta anamnese; correções são feitas após o envio.");
  const q = await prisma.question.findUnique({ where: { id: input.questionId } });
  if (!q) throw new NotFoundError("Pergunta não encontrada.");
  const skip = input.skipReason || null;
  if (skip && !isSkipAllowed(q, skip)) throw new AppError("Opção não disponível para esta pergunta.");
  const newValue = normalizeAnswerValue(q, input.value);

  if (input.correctionRequestId) {
    const cr = await prisma.correctionRequest.findUnique({ where: { id: input.correctionRequestId } });
    if (!cr || cr.anamnesisId !== a.id) throw new AppError("Solicitação de correção inválida.");
  }

  await prisma.$transaction(async (tx) => {
    const existing = await tx.answer.upsert({
      where: { anamnesisId_questionId: { anamnesisId: a.id, questionId: q.id } },
      create: { anamnesisId: a.id, questionId: q.id, value: "" },
      update: {},
    });
    if (existing.value === newValue && (existing.skipReason ?? null) === skip) {
      throw new AppError("A nova resposta é igual à atual; nada foi alterado.");
    }
    await tx.answerRevision.create({
      data: {
        answerId: existing.id,
        previousValue: existing.value,
        previousSkipReason: existing.skipReason,
        newValue,
        newSkipReason: skip,
        reason,
        changedById: adminId,
        correctionRequestId: input.correctionRequestId ?? null,
      },
    });
    await tx.answer.update({ where: { id: existing.id }, data: { value: newValue, skipReason: skip } });
    await audit(
      { actorId: adminId, action: "ANSWER_CORRECTED", entityType: "Anamnesis", entityId: a.id, details: { question: q.number, correctionRequestId: input.correctionRequestId ?? null } },
      tx,
    );
  });
}
