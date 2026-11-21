import { prisma } from "@/lib/db";
import { CORRECTION_STATUS } from "@/lib/constants";
import { AppError, NotFoundError } from "@/lib/errors";
import { isSubmitted } from "@/lib/status";
import { audit } from "./audit";
import { notifyAdmin, notifyUser } from "./notifications";

function cleanMessage(m: string) {
  const s = m.trim();
  if (s.length < 5) throw new AppError("Descreva a correção com um pouco mais de detalhe.");
  if (s.length > 5000) throw new AppError("Mensagem muito longa (máximo de 5000 caracteres).");
  return s;
}

/** A paciente pede correção de uma anamnese já enviada. */
export async function patientRequestCorrection(patientId: string, anamnesisId: string, questionId: string | null, message: string) {
  const msg = cleanMessage(message);
  const a = await prisma.anamnesis.findFirst({ where: { id: anamnesisId, patientId }, include: { patient: true } });
  if (!a) throw new NotFoundError("Anamnese não encontrada.");
  if (!isSubmitted(a)) throw new AppError("Enquanto a anamnese não for enviada, você mesma pode editar suas respostas.");
  if (questionId) {
    const q = await prisma.question.findUnique({ where: { id: questionId } });
    if (!q) throw new AppError("Pergunta inválida.");
  }
  const cr = await prisma.correctionRequest.create({
    data: { anamnesisId, patientId, questionId, origin: "PATIENT", message: msg },
  });
  await notifyAdmin({
    type: "CORRECTION_REQUEST",
    title: "Solicitação de correção",
    body: `${a.patient.fullName} solicitou uma correção na anamnese nº ${a.sequence}.`,
    link: `/admin/anamneses/${anamnesisId}#correcoes`,
  });
  await audit({ actorId: a.patient.userId, action: "CORRECTION_REQUESTED", entityType: "CorrectionRequest", entityId: cr.id });
  return cr;
}

/** A profissional pede um esclarecimento/correção à paciente. */
export async function practitionerRequestCorrection(adminId: string, anamnesisId: string, questionId: string | null, message: string) {
  const msg = cleanMessage(message);
  const a = await prisma.anamnesis.findUnique({ where: { id: anamnesisId }, include: { patient: true } });
  if (!a) throw new NotFoundError();
  const cr = await prisma.correctionRequest.create({
    data: { anamnesisId, patientId: a.patientId, questionId, origin: "PRACTITIONER", message: msg },
  });
  await notifyUser(a.patient.userId, {
    type: "CORRECTION_UPDATE",
    title: "A profissional pediu um esclarecimento",
    body: "Há uma pergunta sobre sua anamnese. Abra para responder.",
    link: `/paciente/anamneses/${anamnesisId}#correcoes`,
  });
  await audit({ actorId: adminId, action: "CLARIFICATION_REQUESTED", entityType: "CorrectionRequest", entityId: cr.id });
  return cr;
}

/** A paciente responde a um pedido de esclarecimento da profissional. */
export async function patientReplyCorrection(patientId: string, requestId: string, reply: string) {
  const msg = cleanMessage(reply);
  const cr = await prisma.correctionRequest.findFirst({ where: { id: requestId, patientId }, include: { patient: true, anamnesis: true } });
  if (!cr) throw new NotFoundError();
  if (cr.origin !== "PRACTITIONER" || cr.status !== CORRECTION_STATUS.OPEN) throw new AppError("Esta solicitação não aceita respostas.");
  await prisma.correctionRequest.update({
    where: { id: cr.id },
    data: { patientReply: msg, repliedAt: new Date(), status: CORRECTION_STATUS.ANSWERED },
  });
  await notifyAdmin({
    type: "NEW_REPLY",
    title: "Nova resposta disponível",
    body: `${cr.patient.fullName} respondeu ao seu pedido de esclarecimento (anamnese nº ${cr.anamnesis.sequence}).`,
    link: `/admin/anamneses/${cr.anamnesisId}#correcoes`,
  });
  await audit({ actorId: cr.patient.userId, action: "CLARIFICATION_ANSWERED", entityType: "CorrectionRequest", entityId: cr.id });
}

export async function resolveCorrection(adminId: string, requestId: string, outcome: "RESOLVED" | "REJECTED", resolution: string) {
  const cr = await prisma.correctionRequest.findUnique({ where: { id: requestId }, include: { patient: true } });
  if (!cr) throw new NotFoundError();
  if (cr.status === CORRECTION_STATUS.RESOLVED || cr.status === CORRECTION_STATUS.REJECTED) throw new AppError("Esta solicitação já foi finalizada.");
  await prisma.correctionRequest.update({
    where: { id: cr.id },
    data: { status: outcome, resolution: resolution.trim().slice(0, 5000) || null, resolvedAt: new Date() },
  });
  await notifyUser(cr.patient.userId, {
    type: "CORRECTION_UPDATE",
    title: "Atualização sobre sua solicitação de correção",
    body: outcome === "RESOLVED" ? "Sua solicitação foi atendida." : "Sua solicitação foi analisada pela profissional.",
    link: `/paciente/anamneses/${cr.anamnesisId}#correcoes`,
  });
  await audit({ actorId: adminId, action: `CORRECTION_${outcome}`, entityType: "CorrectionRequest", entityId: cr.id });
}
