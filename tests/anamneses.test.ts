import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import {
  correctAnswer, getPatientAnamnesis, getQuestions, markReviewed, releaseAnamnesis, saveAnswers, submitAnamnesis, missingRequired,
} from "@/server/services/anamneses";
import { patientRequestCorrection, practitionerRequestCorrection, patientReplyCorrection, resolveCorrection } from "@/server/services/corrections";
import { addNote } from "@/server/services/notes";
import { getReportData, renderReportPdf } from "@/server/services/reports";
import { sweepDeadlines } from "@/server/services/deadlines";
import { updateAppointment } from "@/server/services/appointments";
import { deletePatientData, exportPatientData } from "@/server/services/privacy";
import { fmtDateTime } from "@/lib/dates";
import { ensureAdmin, fillAll, newPatient } from "./helpers";

let adminId: string;
beforeAll(async () => {
  adminId = (await ensureAdmin()).id;
});

describe("questionário", () => {
  it("possui as 20 perguntas originais, com a redação preservada", async () => {
    const qs = await getQuestions();
    expect(qs).toHaveLength(20);
    expect(qs[0].text).toBe("Qual seu nome completo e como você gosta de ser chamada?");
    expect(qs[19].text).toBe("Você está aberta para utilização de rituais e mantras védicos durante o seu tratamento?");
  });

  it("salva respostas automaticamente e permite continuar depois", async () => {
    const { patient, anamnesis } = await newPatient();
    const qs = await getQuestions();
    await saveAnswers(patient.id, anamnesis.id, [{ questionId: qs[2].id, value: "Sinto cansaço há 2 anos." }]);
    const reloaded = await getPatientAnamnesis(patient.id, anamnesis.id);
    expect(reloaded.status).toBe("IN_PROGRESS");
    expect(reloaded.answers.find((a) => a.questionId === qs[2].id)?.value).toBe("Sinto cansaço há 2 anos.");
    // edição antes do envio sobrescreve o rascunho (ainda não é registro fechado)
    await saveAnswers(patient.id, anamnesis.id, [{ questionId: qs[2].id, value: "Sinto cansaço há 3 anos." }]);
    const again = await getPatientAnamnesis(patient.id, anamnesis.id);
    expect(again.answers.filter((a) => a.questionId === qs[2].id)).toHaveLength(1);
  });

  it("aceita 'Não se aplica' apenas onde é permitido", async () => {
    const { patient, anamnesis } = await newPatient();
    const qs = await getQuestions();
    const q6 = qs.find((q) => q.number === 6)!;
    const q3 = qs.find((q) => q.number === 3)!;
    await saveAnswers(patient.id, anamnesis.id, [{ questionId: q6.id, value: "", skipReason: "NOT_APPLICABLE" }]);
    await expect(saveAnswers(patient.id, anamnesis.id, [{ questionId: q3.id, value: "", skipReason: "NOT_APPLICABLE" }])).rejects.toThrow();
  });

  it("não permite enviar com perguntas obrigatórias em branco", async () => {
    const { patient, anamnesis } = await newPatient();
    await expect(submitAnamnesis(patient.id, anamnesis.id)).rejects.toThrow(/faltam respostas/);
    expect((await missingRequired(anamnesis.id)).length).toBe(20);
  });

  it("o envio cria registro fechado: a paciente não consegue mais editar", async () => {
    const { patient, anamnesis } = await newPatient();
    const qs = await fillAll(patient.id, anamnesis.id);
    const r = await submitAnamnesis(patient.id, anamnesis.id);
    expect(r.late).toBe(false);
    const a = await prisma.anamnesis.findUniqueOrThrow({ where: { id: anamnesis.id } });
    expect(a.status).toBe("SUBMITTED");
    expect(a.submittedAt).not.toBeNull();
    await expect(saveAnswers(patient.id, anamnesis.id, [{ questionId: qs[3].id, value: { option: "Sim", details: "x" } }])).rejects.toThrow(/já foi enviada/);
    await expect(submitAnamnesis(patient.id, anamnesis.id)).rejects.toThrow(/já foi enviada/);
  });
});

describe("liberação, prazos e histórico", () => {
  it("nova liberação cria registro independente sem alterar os anteriores", async () => {
    const { patient, anamnesis } = await newPatient();
    await fillAll(patient.id, anamnesis.id);
    await submitAnamnesis(patient.id, anamnesis.id);
    const before = await prisma.answer.findMany({ where: { anamnesisId: anamnesis.id }, orderBy: { id: "asc" } });

    const second = await releaseAnamnesis(adminId, { patientId: patient.id, date: "2026-11-20", time: "14:00", addToAgenda: true });
    expect(second.sequence).toBe(2);
    expect(fmtDateTime(second.dueAt)).toBe("18/11/2026 às 14h00");
    expect(second.appointmentId).not.toBeNull();

    const after = await prisma.answer.findMany({ where: { anamnesisId: anamnesis.id }, orderBy: { id: "asc" } });
    expect(after).toEqual(before);
    expect((await prisma.anamnesis.findUniqueOrThrow({ where: { id: anamnesis.id } })).status).toBe("SUBMITTED");
    const notif = await prisma.notification.findFirst({ where: { type: "NEW_ANAMNESIS", link: `/paciente/anamneses/${second.id}` } });
    expect(notif?.body).toContain("18/11/2026 às 14h00");
  });

  it("anamnese atrasada continua aceitando envio e a profissional é avisada", async () => {
    const { patient } = await newPatient();
    const late = await releaseAnamnesis(adminId, { patientId: patient.id, date: "2020-01-10", time: "10:00", addToAgenda: false });
    await fillAll(patient.id, late.id);
    const r = await submitAnamnesis(patient.id, late.id);
    expect(r.late).toBe(true);
    const a = await prisma.anamnesis.findUniqueOrThrow({ where: { id: late.id } });
    expect(a.submittedLate).toBe(true);
    expect(await prisma.notification.findFirst({ where: { userId: adminId, type: "ANAMNESIS_SUBMITTED_LATE", link: `/admin/anamneses/${late.id}` } })).not.toBeNull();
  });

  it("avisos de prazo são emitidos uma única vez", async () => {
    const { patient } = await newPatient();
    const overdue = await releaseAnamnesis(adminId, { patientId: patient.id, date: "2020-02-10", time: "10:00", addToAgenda: false });
    await sweepDeadlines({ force: true });
    await sweepDeadlines({ force: true });
    const n = await prisma.notification.count({ where: { userId: adminId, type: "OVERDUE", link: `/admin/anamneses/${overdue.id}` } });
    expect(n).toBe(1);
  });

  it("remarcar o compromisso recalcula o prazo de anamnese não enviada", async () => {
    const { patient } = await newPatient();
    const a = await releaseAnamnesis(adminId, { patientId: patient.id, date: "2027-03-10", time: "15:00", addToAgenda: true });
    await updateAppointment(adminId, a.appointmentId!, { title: "Consulta", date: "2027-03-12", time: "09:00", durationMin: 60, patientId: patient.id });
    const updated = await prisma.anamnesis.findUniqueOrThrow({ where: { id: a.id } });
    expect(fmtDateTime(updated.dueAt)).toBe("10/03/2027 às 09h00");
  });
});

describe("isolamento entre pacientes", () => {
  it("uma paciente não acessa, edita nem pede correção da anamnese de outra", async () => {
    const a = await newPatient("Paciente A");
    const b = await newPatient("Paciente B");
    const qs = await getQuestions();
    await expect(getPatientAnamnesis(b.patient.id, a.anamnesis.id)).rejects.toThrow(/não encontrada/);
    await expect(saveAnswers(b.patient.id, a.anamnesis.id, [{ questionId: qs[2].id, value: "invasão" }])).rejects.toThrow(/não encontrada/);
    await expect(submitAnamnesis(b.patient.id, a.anamnesis.id)).rejects.toThrow(/não encontrada/);
    await fillAll(a.patient.id, a.anamnesis.id);
    await submitAnamnesis(a.patient.id, a.anamnesis.id);
    await expect(patientRequestCorrection(b.patient.id, a.anamnesis.id, null, "quero mudar")).rejects.toThrow(/não encontrada/);
  });
});

describe("correções, observações e relatórios", () => {
  it("correção preserva a resposta anterior, registra responsável e data", async () => {
    const { patient, anamnesis } = await newPatient();
    const qs = await fillAll(patient.id, anamnesis.id);
    await submitAnamnesis(patient.id, anamnesis.id);
    const q3 = qs.find((q) => q.number === 3)!;
    const cr = await patientRequestCorrection(patient.id, anamnesis.id, q3.id, "Escrevi o tempo errado, são 5 anos.");
    expect(await prisma.notification.findFirst({ where: { userId: adminId, type: "CORRECTION_REQUEST" }, orderBy: { createdAt: "desc" } })).not.toBeNull();

    await correctAnswer(adminId, { anamnesisId: anamnesis.id, questionId: q3.id, value: "Sinto cansaço há 5 anos.", reason: "Pedido da paciente", correctionRequestId: cr.id });
    await resolveCorrection(adminId, cr.id, "RESOLVED", "Corrigido.");

    const ans = await prisma.answer.findFirstOrThrow({ where: { anamnesisId: anamnesis.id, questionId: q3.id }, include: { revisions: true } });
    expect(ans.value).toBe("Sinto cansaço há 5 anos.");
    expect(ans.revisions).toHaveLength(1);
    expect(ans.revisions[0].previousValue).toBe("Resposta fictícia da pergunta 3.");
    expect(ans.revisions[0].changedById).toBe(adminId);
    expect(await prisma.auditLog.findFirst({ where: { action: "ANSWER_CORRECTED", entityId: anamnesis.id } })).not.toBeNull();
    await expect(
      correctAnswer(adminId, { anamnesisId: anamnesis.id, questionId: q3.id, value: "Sinto cansaço há 5 anos.", reason: "repetida" }),
    ).rejects.toThrow(/igual/);
  });

  it("pedido de esclarecimento da profissional: paciente responde e a profissional é notificada", async () => {
    const { patient, anamnesis } = await newPatient();
    await fillAll(patient.id, anamnesis.id);
    await submitAnamnesis(patient.id, anamnesis.id);
    const cr = await practitionerRequestCorrection(adminId, anamnesis.id, null, "Pode detalhar o horário do almoço?");
    await patientReplyCorrection(patient.id, cr.id, "Almoço por volta das 13h.");
    expect((await prisma.correctionRequest.findUniqueOrThrow({ where: { id: cr.id } })).status).toBe("ANSWERED");
    expect(await prisma.notification.findFirst({ where: { userId: adminId, type: "NEW_REPLY" }, orderBy: { createdAt: "desc" } })).not.toBeNull();
  });

  it("marcar como revisada não altera as respostas", async () => {
    const { patient, anamnesis } = await newPatient();
    await fillAll(patient.id, anamnesis.id);
    await submitAnamnesis(patient.id, anamnesis.id);
    const before = await prisma.answer.findMany({ where: { anamnesisId: anamnesis.id }, orderBy: { id: "asc" } });
    await markReviewed(adminId, anamnesis.id);
    const after = await prisma.answer.findMany({ where: { anamnesisId: anamnesis.id }, orderBy: { id: "asc" } });
    expect(after).toEqual(before);
    expect((await prisma.anamnesis.findUniqueOrThrow({ where: { id: anamnesis.id } })).status).toBe("REVIEWED");
  });

  it("relatórios trazem as 20 perguntas e nunca as observações internas", async () => {
    const { patient, anamnesis } = await newPatient();
    await fillAll(patient.id, anamnesis.id);
    await submitAnamnesis(patient.id, anamnesis.id);
    await addNote(adminId, { patientId: patient.id, anamnesisId: anamnesis.id, content: "OBSERVACAO-SECRETA-INTERNA" });
    const data = await getReportData(anamnesis.id);
    const fullCount = data.full.reduce((n, s) => n + s.items.length, 0);
    const sumCount = data.summary.reduce((n, s) => n + s.items.length, 0);
    expect(fullCount).toBe(20);
    expect(sumCount).toBe(20);
    expect(data.unanswered).toEqual([]);
    expect(JSON.stringify(data)).not.toContain("OBSERVACAO-SECRETA-INTERNA");
    expect(data.full[0].items[0].text).toBe("Qual seu nome completo e como você gosta de ser chamada?");
    const pdf = await renderReportPdf(data, "FULL");
    expect(pdf.subarray(0, 4).toString()).toBe("%PDF");
    const pdf2 = await renderReportPdf(data, "SUMMARY");
    expect(pdf2.length).toBeGreaterThan(1000);
  });

  it("relatório identifica perguntas não respondidas", async () => {
    const { anamnesis } = await newPatient();
    const data = await getReportData(anamnesis.id);
    expect(data.unanswered).toHaveLength(20);
  });
});

describe("LGPD", () => {
  it("exporta os dados da titular sem observações internas e exclui quando solicitado", async () => {
    const { patient, anamnesis, user } = await newPatient("Excluir Fictícia");
    await fillAll(patient.id, anamnesis.id);
    await addNote(adminId, { patientId: patient.id, content: "NOTA-INTERNA-X" });
    const exp = await exportPatientData(patient.id);
    expect(exp.cadastro.email).toBe(user.email);
    expect(JSON.stringify(exp)).not.toContain("NOTA-INTERNA-X");
    await expect(deletePatientData(adminId, patient.id, "errado@x.test")).rejects.toThrow();
    await deletePatientData(adminId, patient.id, user.email);
    expect(await prisma.patient.findUnique({ where: { id: patient.id } })).toBeNull();
    expect(await prisma.answer.count({ where: { anamnesisId: anamnesis.id } })).toBe(0);
    expect(await prisma.auditLog.findFirst({ where: { action: "PATIENT_DATA_DELETED", entityId: patient.id } })).not.toBeNull();
  });
});
