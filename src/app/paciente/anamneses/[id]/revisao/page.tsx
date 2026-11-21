import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { isAnswered } from "@/lib/answers";
import { fmtDateTime } from "@/lib/dates";
import { isSubmitted, isOverdue } from "@/lib/status";
import { STEPS } from "@/lib/questions";
import { submitAnamnesisAction } from "@/app/actions/patient";
import { AnswersView } from "@/components/AnswersView";
import { PageHeader } from "@/components/ui/PageHeader";
import { SubmitPanel } from "@/components/patient/SubmitPanel";
import { requirePatientPage } from "@/server/session";

export const metadata = { title: "Revisão da anamnese" };

export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const u = await requirePatientPage();
  const a = await prisma.anamnesis.findFirst({ where: { id, patientId: u.patientId }, include: { answers: true } });
  if (!a) notFound();
  if (isSubmitted(a)) redirect(`/paciente/anamneses/${a.id}`);
  const questions = await prisma.question.findMany({ where: { isActive: true }, orderBy: { number: "asc" } });
  const byQ = new Map(a.answers.map((x) => [x.questionId, x]));
  const missing = questions.filter((q) => q.required && !isAnswered(q, byQ.get(q.id)));
  const stepOf = (cat: string) => STEPS.findIndex((s) => s.title === cat) + 1;

  return (
    <>
      <PageHeader
        title="Revise suas respostas"
        subtitle="Confira tudo com atenção. Depois do envio, a anamnese vira um registro fechado e não poderá ser editada diretamente."
        actions={<Link href={`/paciente/anamneses/${a.id}`} className="btn-ghost btn-sm">Voltar ao questionário</Link>}
      />
      {missing.length > 0 && (
        <div role="alert" className="mb-6 rounded-2xl border border-terra-400/30 bg-bege-50 p-5">
          <p className="font-semibold text-terra-700">Ainda faltam {missing.length} resposta(s) obrigatória(s):</p>
          <ul className="mt-2 space-y-1 text-sm">
            {missing.map((q) => (
              <li key={q.id}>
                <Link className="link" href={`/paciente/anamneses/${a.id}?etapa=${stepOf(q.category)}`}>Pergunta {q.number} — {q.text.slice(0, 70)}…</Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="card p-5 sm:p-7">
        <AnswersView
          questions={questions}
          answers={a.answers}
          renderExtra={(q) => (
            <Link href={`/paciente/anamneses/${a.id}?etapa=${stepOf(q.category)}`} className="mt-2 inline-block text-xs font-semibold text-salvia-600 hover:text-salvia-800">
              Editar
            </Link>
          )}
        />
      </div>
      <SubmitPanel
        action={submitAnamnesisAction.bind(null, a.id)}
        disabled={missing.length > 0}
        lateNote={isOverdue(a) ? `O prazo (${fmtDateTime(a.dueAt)}) já passou — o envio continua permitido.` : a.dueAt ? `Prazo: ${fmtDateTime(a.dueAt)}.` : null}
      />
    </>
  );
}
