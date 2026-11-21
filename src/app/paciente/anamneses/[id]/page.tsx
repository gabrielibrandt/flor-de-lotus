import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Download, Printer } from "lucide-react";
import { prisma } from "@/lib/db";
import { CORRECTION_STATUS_LABEL } from "@/lib/constants";
import { fmtDateTime } from "@/lib/dates";
import { isSubmitted, isOverdue } from "@/lib/status";
import { requestCorrectionAction, replyCorrectionAction } from "@/app/actions/patient";
import { AnswersView } from "@/components/AnswersView";
import { Questionnaire } from "@/components/questionnaire/Questionnaire";
import { RequestCorrectionForm, ReplyForm } from "@/components/patient/CorrectionForms";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pill } from "@/components/ui/StatusBadge";
import { requirePatientPage } from "@/server/session";
import { buildInitialAnswers, buildSteps, toQView } from "@/server/questionnaire-view";

export const metadata = { title: "Anamnese" };

export default async function PatientAnamnesisPage({
  params, searchParams,
}: { params: Promise<{ id: string }>; searchParams: Promise<{ etapa?: string; enviada?: string; atraso?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const u = await requirePatientPage();
  // Isolamento: somente anamneses da própria paciente
  const a = await prisma.anamnesis.findFirst({
    where: { id, patientId: u.patientId },
    include: {
      answers: { include: { revisions: { orderBy: { changedAt: "desc" }, take: 1, select: { changedAt: true } } } },
      correctionRequests: { orderBy: { createdAt: "desc" }, include: { question: { select: { number: true } } } },
      patient: true,
    },
  });
  if (!a) notFound();
  const questions = (await prisma.question.findMany({ where: { isActive: true }, orderBy: { number: "asc" } })).map(toQView);

  if (!isSubmitted(a)) {
    const initial = buildInitialAnswers(questions, a.answers);
    const prefillDirty: string[] = [];
    const q1 = questions.find((q) => q.number === 1);
    if (q1 && !initial[q1.id]) {
      initial[q1.id] = { value: { nomeCompleto: a.patient.fullName, comoGostaDeSerChamada: a.patient.preferredName }, skipReason: null };
      prefillDirty.push(q1.id);
    }
    const deadline = a.dueAt ? `${isOverdue(a) ? "Prazo vencido em" : "Enviar até"} ${fmtDateTime(a.dueAt)}` : null;
    return (
      <>
        <PageHeader
          title={`Anamnese nº ${a.sequence}`}
          subtitle={
            <>
              Responda com calma, com suas próprias palavras. Leva cerca de 30 minutos e tudo é salvo automaticamente.
              {a.consultationAt && <> Consulta: <strong>{fmtDateTime(a.consultationAt)}</strong>.</>}
            </>
          }
        />
        {isOverdue(a) && (
          <p className="mb-6 rounded-xl bg-bege-100 px-4 py-3 text-sm text-terra-700">
            O prazo de envio ({fmtDateTime(a.dueAt)}) já passou, mas você ainda pode concluir e enviar sua anamnese normalmente.
          </p>
        )}
        <Questionnaire
          anamnesisId={a.id}
          steps={buildSteps(questions)}
          initial={initial}
          prefillDirty={prefillDirty}
          initialStep={Math.max(0, Number(sp.etapa ?? 1) - 1) || 0}
          deadlineLabel={deadline}
        />
      </>
    );
  }

  return (
    <>
      {sp.enviada && (
        <div role="status" className="mb-8 flex items-start gap-3 rounded-2xl bg-salvia-50 p-5 text-salvia-800">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-salvia-600" aria-hidden />
          <div>
            <p className="font-semibold">Anamnese enviada com sucesso. Obrigada pela dedicação!</p>
            {sp.atraso && <p className="text-sm">Ela foi enviada após o prazo; a profissional já foi avisada.</p>}
          </div>
        </div>
      )}
      <PageHeader
        title={`Anamnese nº ${a.sequence}`}
        subtitle={<>Enviada em {fmtDateTime(a.submittedAt)}{a.submittedLate ? " (após o prazo)" : ""}{a.consultationAt ? ` · Consulta de ${fmtDateTime(a.consultationAt)}` : ""}</>}
        actions={
          <>
            <a href={`/api/paciente/anamneses/${a.id}/pdf`} className="btn-secondary btn-sm"><Download className="h-4 w-4" aria-hidden /> Baixar PDF</a>
            <Link href="/paciente" className="btn-ghost btn-sm">Voltar</Link>
          </>
        }
      />
      <p className="mb-6 rounded-xl bg-bege-50 px-4 py-3 text-sm text-salvia-700">
        Esta anamnese é um registro fechado e não pode ser editada diretamente. Se encontrou algum erro, solicite uma correção à profissional no final da página.
      </p>
      <div className="card p-5 sm:p-7">
        <AnswersView questions={questions} answers={a.answers} />
      </div>

      <section id="correcoes" className="mt-10 scroll-mt-24">
        <h2 className="text-2xl">Correções e esclarecimentos</h2>
        <div className="mt-4 space-y-4">
          {a.correctionRequests.map((c) => (
            <div key={c.id} className="card p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-salvia-800">
                  {c.origin === "PATIENT" ? "Sua solicitação" : "Pedido de esclarecimento da profissional"}
                  {c.question ? ` · pergunta ${c.question.number}` : ""}
                </p>
                <Pill tone={c.status === "OPEN" ? "warn" : "ok"}>{CORRECTION_STATUS_LABEL[c.status]}</Pill>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-salvia-700">{c.message}</p>
              <p className="mt-1 text-xs text-salvia-400">{fmtDateTime(c.createdAt)}</p>
              {c.patientReply && <p className="mt-3 rounded-lg bg-bege-50 p-3 text-sm text-salvia-700"><strong>Sua resposta:</strong> {c.patientReply}</p>}
              {c.resolution && <p className="mt-3 rounded-lg bg-salvia-50 p-3 text-sm text-salvia-700"><strong>Retorno da profissional:</strong> {c.resolution}</p>}
              {c.origin === "PRACTITIONER" && c.status === "OPEN" && <ReplyForm action={replyCorrectionAction.bind(null, c.id, a.id)} />}
            </div>
          ))}
          <div className="card p-5 sm:p-6">
            <h3 className="text-xl">Solicitar uma correção</h3>
            <p className="mb-4 mt-1 text-sm text-salvia-600">A profissional avalia o pedido e, se necessário, corrige a resposta. O histórico original é sempre preservado.</p>
            <RequestCorrectionForm action={requestCorrectionAction.bind(null, a.id)} questions={questions} />
          </div>
        </div>
      </section>
      <p className="mt-6 text-center text-xs text-salvia-400 no-print"><Printer className="mr-1 inline h-3 w-3" aria-hidden />Para imprimir, baixe o PDF.</p>
    </>
  );
}
