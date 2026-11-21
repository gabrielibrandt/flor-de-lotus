import { prisma } from "@/lib/db";
import { AppError, NotFoundError } from "@/lib/errors";
import { answerToPlainText } from "@/lib/answers";
import { DATA_REQUEST_TYPE_LABEL } from "@/lib/constants";
import { audit } from "./audit";
import { notifyAdmin, notifyUser } from "./notifications";

/**
 * Exportação dos dados da titular (LGPD, art. 18). Inclui cadastro, anamneses,
 * respostas, solicitações e notificações. Observações internas da profissional
 * não fazem parte da exportação (regra de negócio: são exclusivamente internas).
 */
export async function exportPatientData(patientId: string) {
  const p = await prisma.patient.findUnique({
    where: { id: patientId },
    include: {
      user: { select: { email: true, createdAt: true, lastLoginAt: true } },
      anamneses: {
        orderBy: { sequence: "asc" },
        include: { answers: { include: { question: true } } },
      },
      correctionRequests: { orderBy: { createdAt: "asc" } },
      dataRequests: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!p) throw new NotFoundError();
  const notifications = await prisma.notification.findMany({ where: { userId: p.userId }, orderBy: { createdAt: "asc" } });
  await audit({ actorId: p.userId, action: "DATA_EXPORTED", entityType: "Patient", entityId: p.id });
  return {
    exportadoEm: new Date().toISOString(),
    cadastro: {
      nomeCompleto: p.fullName,
      comoGostaDeSerChamada: p.preferredName,
      email: p.user.email,
      criadoEm: p.createdAt,
      ultimoAcesso: p.user.lastLoginAt,
      consentimentoEm: p.consentAt,
      versaoPoliticaPrivacidade: p.privacyVersion,
    },
    anamneses: p.anamneses.map((a) => ({
      numero: a.sequence,
      situacao: a.status,
      consulta: a.consultationAt,
      prazo: a.dueAt,
      iniciadaEm: a.startedAt,
      enviadaEm: a.submittedAt,
      enviadaForaDoPrazo: a.submittedLate,
      respostas: a.answers
        .sort((x, y) => x.question.number - y.question.number)
        .map((ans) => ({ pergunta: ans.question.number, enunciado: ans.question.text, resposta: answerToPlainText(ans.question, ans) })),
    })),
    solicitacoesDeCorrecao: p.correctionRequests.map((c) => ({
      criadaEm: c.createdAt, origem: c.origin, mensagem: c.message, resposta: c.patientReply, situacao: c.status, retorno: c.resolution,
    })),
    solicitacoesLGPD: p.dataRequests.map((d) => ({ tipo: d.type, detalhes: d.details, situacao: d.status, retorno: d.response, criadaEm: d.createdAt })),
    notificacoes: notifications.map((n) => ({ titulo: n.title, mensagem: n.body, criadaEm: n.createdAt, lidaEm: n.readAt })),
  };
}

export async function createDataRequest(patientId: string, type: string, details: string) {
  if (!(type in DATA_REQUEST_TYPE_LABEL)) throw new AppError("Tipo de solicitação inválido.");
  const p = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!p) throw new NotFoundError();
  const open = await prisma.dataRequest.findFirst({ where: { patientId, type, status: "OPEN" } });
  if (open) throw new AppError("Você já tem uma solicitação deste tipo em análise.");
  const dr = await prisma.dataRequest.create({ data: { patientId, type, details: details.trim().slice(0, 3000) || null } });
  await notifyAdmin({
    type: "DATA_REQUEST",
    title: "Solicitação sobre dados pessoais (LGPD)",
    body: `${p.fullName}: ${DATA_REQUEST_TYPE_LABEL[type]}.`,
    link: `/admin/solicitacoes`,
  });
  await audit({ actorId: p.userId, action: "DATA_REQUEST_CREATED", entityType: "DataRequest", entityId: dr.id, details: { type } });
  return dr;
}

export async function resolveDataRequest(adminId: string, id: string, status: "DONE" | "REJECTED", response: string) {
  const dr = await prisma.dataRequest.findUnique({ where: { id }, include: { patient: true } });
  if (!dr) throw new NotFoundError();
  if (dr.status !== "OPEN") throw new AppError("Esta solicitação já foi finalizada.");
  await prisma.dataRequest.update({ where: { id }, data: { status, response: response.trim().slice(0, 3000) || null, resolvedAt: new Date() } });
  await notifyUser(dr.patient.userId, {
    type: "DATA_REQUEST_UPDATE",
    title: "Atualização sobre sua solicitação de dados",
    body: `${DATA_REQUEST_TYPE_LABEL[dr.type]}: ${status === "DONE" ? "atendida" : "analisada"}.`,
    link: "/paciente/conta",
  });
  await audit({ actorId: adminId, action: `DATA_REQUEST_${status}`, entityType: "DataRequest", entityId: id });
}

/**
 * Exclusão definitiva da conta e dos dados da paciente (direito de eliminação).
 * Antes de executar, a profissional deve avaliar obrigações legais de retenção.
 * Compromissos da agenda são mantidos, mas anonimizados; o registro de auditoria
 * guarda apenas o identificador técnico.
 */
export async function deletePatientData(adminId: string, patientId: string, confirmEmail: string) {
  const p = await prisma.patient.findUnique({ where: { id: patientId }, include: { user: true, anamneses: { select: { id: true } } } });
  if (!p) throw new NotFoundError();
  if (confirmEmail.trim().toLowerCase() !== p.user.email) throw new AppError("Digite o e-mail da paciente para confirmar a exclusão.");
  const linkIds = [p.id, ...p.anamneses.map((a) => a.id)];
  await prisma.$transaction(async (tx) => {
    await tx.appointment.updateMany({
      where: { patientId: p.id },
      data: { title: "Atendimento (dados excluídos)", description: null, privateNotes: null },
    });
    for (const id of linkIds) {
      await tx.notification.deleteMany({ where: { link: { contains: id } } });
    }
    await tx.user.delete({ where: { id: p.userId } }); // cascata: paciente, anamneses, respostas, notas, relatórios…
    await audit({ actorId: adminId, action: "PATIENT_DATA_DELETED", entityType: "Patient", entityId: p.id }, tx);
  });
}
