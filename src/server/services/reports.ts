import PDFDocument from "pdfkit";
import { prisma } from "@/lib/db";
import { NotFoundError } from "@/lib/errors";
import { answerParts, hasContent, isAnswered, AnswerPart } from "@/lib/answers";
import { fmtDate, fmtDateTime } from "@/lib/dates";
import { STEPS, SUMMARY_CATEGORIES } from "@/lib/questions";
import { statusLabel } from "@/lib/status";
import { audit } from "./audit";

/** Rótulos curtos usados apenas no relatório resumido (o enunciado completo fica no relatório completo). */
export const SHORT_LABELS: Record<number, string> = {
  1: "Nome e como gosta de ser chamada",
  2: "Nascimento e residência",
  3: "Principais queixas e há quanto tempo",
  4: "Tratamento alopático ou homeopático",
  5: "Alergias, intolerâncias e sensibilidade (PAS)",
  6: "Menarca e ciclo menstrual",
  7: "Gestação",
  8: "DIU ou contraceptivos hormonais",
  9: "Segura xixi, cocô e pum?",
  10: "Segura choro, bocejo, arroto, fome, sede ou sono?",
  11: "Rotina da manhã (6h–12h)",
  12: "Rotina da tarde (12h–18h)",
  13: "Rotina da noite (18h até dormir)",
  14: "Sono",
  15: "Sistema excretor (micção, evacuação, suor)",
  16: "Atividade física",
  17: "Alimentos que não gosta ou não tolera / vegana ou vegetariana",
  18: "Aberta à alimentação vegetariana (~15 dias)?",
  19: "Aberta a fitoterápicos ayurvédicos?",
  20: "Aberta a rituais e mantras védicos?",
};

export type ReportItem = {
  number: number;
  text: string;
  shortLabel: string;
  answered: boolean;
  partial: boolean;
  parts: AnswerPart[];
  correctedAt: Date | null;
};
export type ReportSection = { title: string; items: ReportItem[] };
export type ReportData = {
  patient: { fullName: string; preferredName: string; email: string; createdAt: Date };
  anamnesis: {
    id: string; sequence: number; status: string; startedAt: Date | null; lastSavedAt: Date | null;
    submittedAt: Date | null; submittedLate: boolean; consultationAt: Date | null; dueAt: Date | null;
  };
  full: ReportSection[];
  summary: ReportSection[];
  unanswered: number[];
};

/**
 * Monta os dados do relatório a partir do banco. As respostas são reproduzidas
 * integralmente, sem resumo, reescrita, interpretação ou diagnóstico.
 * Observações internas da profissional NUNCA são incluídas.
 */
export async function getReportData(anamnesisId: string): Promise<ReportData> {
  const a = await prisma.anamnesis.findUnique({
    where: { id: anamnesisId },
    include: {
      patient: { include: { user: { select: { email: true } } } },
      answers: { include: { revisions: { orderBy: { changedAt: "desc" }, take: 1 } } },
    },
  });
  if (!a) throw new NotFoundError("Anamnese não encontrada.");
  const questions = await prisma.question.findMany({ where: { isActive: true }, orderBy: { number: "asc" } });
  const byQ = new Map(a.answers.map((x) => [x.questionId, x]));

  const items = questions.map((q) => {
    const ans = byQ.get(q.id);
    const answered = isAnswered(q, ans);
    return {
      q,
      item: {
        number: q.number,
        text: q.text,
        shortLabel: SHORT_LABELS[q.number] ?? q.text,
        answered,
        partial: !answered && hasContent(ans),
        parts: answerParts(q, ans),
        correctedAt: ans?.revisions[0]?.changedAt ?? null,
      } satisfies ReportItem,
    };
  });

  const full = STEPS.map((s) => ({ title: s.title, items: items.filter((x) => x.q.category === s.title).map((x) => x.item) }));
  const summary = SUMMARY_CATEGORIES.map((c) => ({ title: c, items: items.filter((x) => x.q.summaryCategory === c).map((x) => x.item) }));

  return {
    patient: { fullName: a.patient.fullName, preferredName: a.patient.preferredName, email: a.patient.user.email, createdAt: a.patient.createdAt },
    anamnesis: {
      id: a.id, sequence: a.sequence, status: statusLabel(a), startedAt: a.startedAt, lastSavedAt: a.lastSavedAt,
      submittedAt: a.submittedAt, submittedLate: a.submittedLate, consultationAt: a.consultationAt, dueAt: a.dueAt,
    },
    full: full.filter((s) => s.items.length),
    summary: summary.filter((s) => s.items.length),
    unanswered: items.filter((x) => !x.item.answered).map((x) => x.item.number),
  };
}

// ---------------------------------------------------------------- PDF

const C = {
  salvia: "#5a7151",
  salviaClaro: "#e4ebe0",
  oliva: "#5f6529",
  bege: "#f5eee1",
  terra: "#6f4f37",
  texto: "#2f3b2c",
  suave: "#6b7466",
  alerta: "#8a6446",
};

function drawLotus(doc: PDFKit.PDFDocument, cx: number, cy: number, s: number) {
  doc.save();
  const petal = (angle: number, color: string, scale = 1) => {
    doc.save().translate(cx, cy).rotate(angle);
    doc.path(`M 0 0 C ${-6 * s * scale} ${-8 * s * scale}, ${-5 * s * scale} ${-17 * s * scale}, 0 ${-22 * s * scale} C ${5 * s * scale} ${-17 * s * scale}, ${6 * s * scale} ${-8 * s * scale}, 0 0 Z`).fill(color);
    doc.restore();
  };
  petal(-62, "#a9bea0", 0.8);
  petal(62, "#a9bea0", 0.8);
  petal(-30, "#8ba57f", 0.95);
  petal(30, "#8ba57f", 0.95);
  petal(0, C.salvia, 1);
  doc.restore();
}

export function renderReportPdf(data: ReportData, type: "FULL" | "SUMMARY"): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 96, bottom: 64, left: 56, right: 56 },
      bufferPages: true,
      info: {
        Title: `Anamnese ${type === "FULL" ? "completa" : "resumida"} — ${data.patient.fullName}`,
        Author: "Flor de Lótus – Yoga e Ayurveda para Mulheres",
      },
    });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const W = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const left = doc.page.margins.left;

    const ensureSpace = (h: number) => {
      if (doc.y + h > doc.page.height - doc.page.margins.bottom) doc.addPage();
    };

    // --- Identificação
    doc.fillColor(C.salvia).font("Helvetica-Bold").fontSize(15)
      .text(type === "FULL" ? "Relatório completo da anamnese" : "Relatório resumido da anamnese", left, doc.y);
    doc.moveDown(0.3);
    doc.font("Helvetica").fontSize(9).fillColor(C.suave).text(
      type === "FULL"
        ? "Reprodução integral das perguntas e respostas fornecidas pela paciente, sem resumo, reescrita, interpretação ou diagnóstico."
        : "Organização das respostas por tema para consulta rápida. As palavras da paciente são preservadas; não há interpretação, conclusão clínica nem uso de inteligência artificial. Consulte o relatório completo para os enunciados integrais.",
      { width: W },
    );
    doc.moveDown(0.8);

    const boxTop = doc.y;
    const rows: [string, string][] = [
      ["Paciente", data.patient.fullName],
      ["Como gosta de ser chamada", data.patient.preferredName],
      ["E-mail", data.patient.email],
      ["Cadastro em", fmtDate(data.patient.createdAt)],
      ["Anamnese", `nº ${data.anamnesis.sequence} — ${data.anamnesis.status}`],
      ["Início do preenchimento", fmtDateTime(data.anamnesis.startedAt)],
      ["Envio", data.anamnesis.submittedAt ? `${fmtDateTime(data.anamnesis.submittedAt)}${data.anamnesis.submittedLate ? " (fora do prazo)" : ""}` : "Não enviada"],
      ["Consulta relacionada", data.anamnesis.consultationAt ? fmtDateTime(data.anamnesis.consultationAt) : "Sem consulta vinculada"],
      ["Prazo de envio", data.anamnesis.dueAt ? fmtDateTime(data.anamnesis.dueAt) : "Sem prazo definido"],
    ];
    const rowH = 15;
    const boxH = rows.length * rowH + 16;
    doc.roundedRect(left, boxTop, W, boxH, 8).fill(C.bege);
    rows.forEach(([k, v], i) => {
      const y = boxTop + 9 + i * rowH;
      doc.font("Helvetica-Bold").fontSize(9).fillColor(C.terra).text(k, left + 12, y, { width: 150 });
      doc.font("Helvetica").fontSize(9).fillColor(C.texto).text(v, left + 170, y, { width: W - 182, ellipsis: true, height: rowH });
    });
    doc.y = boxTop + boxH + 14;
    doc.x = left;

    if (data.unanswered.length) {
      doc.font("Helvetica-Bold").fontSize(9).fillColor(C.alerta)
        .text(`Perguntas não respondidas ou incompletas: ${data.unanswered.join(", ")}.`, left, doc.y, { width: W });
      doc.moveDown(0.6);
    }

    const sections = type === "FULL" ? data.full : data.summary;
    for (const section of sections) {
      ensureSpace(60);
      doc.moveDown(0.4);
      const y = doc.y;
      doc.rect(left, y, W, 20).fill(C.salviaClaro);
      doc.font("Helvetica-Bold").fontSize(11).fillColor(C.salvia).text(section.title.toUpperCase(), left + 10, y + 5, { width: W - 20, characterSpacing: 0.8 });
      doc.y = y + 28;
      doc.x = left;

      for (const item of section.items) {
        ensureSpace(48);
        const heading = type === "FULL" ? `${item.number}. ${item.text}` : `${item.number}. ${item.shortLabel}`;
        doc.font("Helvetica-Bold").fontSize(type === "FULL" ? 10 : 9.5).fillColor(C.oliva).text(heading, left, doc.y, { width: W });
        doc.moveDown(0.25);
        if (!item.parts.length) {
          doc.font("Helvetica-Oblique").fontSize(9.5).fillColor(C.alerta).text("Não respondida.", { width: W });
        } else {
          for (const p of item.parts) {
            if (p.label) {
              doc.font("Helvetica-Bold").fontSize(9.5).fillColor(C.terra).text(`${p.label}: `, left + 8, doc.y, { continued: true, width: W - 8 });
              doc.font("Helvetica").fillColor(C.texto).text(p.text, { width: W - 8 });
            } else {
              doc.font("Helvetica").fontSize(9.5).fillColor(C.texto).text(p.text, left + 8, doc.y, { width: W - 8, lineGap: 1.5 });
            }
          }
          if (item.partial) doc.font("Helvetica-Oblique").fontSize(8.5).fillColor(C.alerta).text("Resposta incompleta.", left + 8);
        }
        if (item.correctedAt) {
          doc.font("Helvetica-Oblique").fontSize(8).fillColor(C.suave)
            .text(`Resposta corrigida pela profissional em ${fmtDateTime(item.correctedAt)}; o histórico original é preservado no sistema.`, left + 8, doc.y, { width: W - 8 });
        }
        doc.moveDown(0.7);
        doc.x = left;
      }
    }

    // --- Cabeçalho e rodapé em todas as páginas
    const range = doc.bufferedPageRange();
    const generated = fmtDateTime(new Date());
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      const top = doc.page.margins.top;
      const bottom = doc.page.margins.bottom;
      doc.page.margins.top = 0;
      doc.page.margins.bottom = 0;
      drawLotus(doc, left + 14, 58, 1.1);
      doc.font("Helvetica-Bold").fontSize(13).fillColor(C.salvia).text("Flor de Lótus", left + 36, 36, { lineBreak: false });
      doc.font("Helvetica").fontSize(8.5).fillColor(C.suave).text("Yoga e Ayurveda para Mulheres", left + 36, 53, { lineBreak: false });
      doc.font("Helvetica").fontSize(8).fillColor(C.suave)
        .text(`${data.patient.fullName} · Anamnese nº ${data.anamnesis.sequence}`, left, 40, { width: W, align: "right", lineBreak: false });
      doc.text(`Gerado em ${generated}`, left, 52, { width: W, align: "right", lineBreak: false });
      doc.moveTo(left, 74).lineTo(left + W, 74).lineWidth(0.6).strokeColor(C.salviaClaro).stroke();
      const fy = doc.page.height - 40;
      doc.moveTo(left, fy - 8).lineTo(left + W, fy - 8).lineWidth(0.6).strokeColor(C.salviaClaro).stroke();
      doc.fontSize(7.5).fillColor(C.suave)
        .text("Documento confidencial — contém dados pessoais sensíveis (LGPD).", left, fy, { width: W / 2 + 60, lineBreak: false });
      doc.text(`Página ${i - range.start + 1} de ${range.count}`, left, fy, { width: W, align: "right", lineBreak: false });
      doc.page.margins.top = top;
      doc.page.margins.bottom = bottom;
    }
    doc.end();
  });
}

function slug(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase();
}

/** Gera e arquiva o PDF (no banco, nunca em pasta pública). */
export async function generateAndStoreReport(actorId: string, anamnesisId: string, type: "FULL" | "SUMMARY") {
  const data = await getReportData(anamnesisId);
  const pdf = await renderReportPdf(data, type);
  const fileName = `anamnese-${data.anamnesis.sequence}-${type === "FULL" ? "completa" : "resumida"}-${slug(data.patient.fullName)}.pdf`;
  const report = await prisma.report.create({
    data: { anamnesisId, type, generatedById: actorId, fileName, pdf: new Uint8Array(pdf), sizeBytes: pdf.length },
    select: { id: true, fileName: true },
  });
  await audit({ actorId, action: "REPORT_GENERATED", entityType: "Report", entityId: report.id, details: { anamnesisId, type } });
  return { ...report, pdf };
}
