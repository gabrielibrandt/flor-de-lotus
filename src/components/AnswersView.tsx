import { answerParts, isAnswered, hasContent } from "@/lib/answers";
import { fmtDateTime } from "@/lib/dates";
import { STEPS } from "@/lib/questions";

type Q = { id: string; number: number; text: string; category: string; fieldType: string; config: string | null; required: boolean; allowNotApplicable: boolean; allowPreferNot: boolean };
type A = { id: string; questionId: string; value: string; skipReason: string | null; revisions?: { changedAt: Date }[] };

/** Exibição fiel das respostas, organizadas por categoria. */
export function AnswersView<QT extends Q, AT extends A>({ questions, answers, renderExtra }: { questions: QT[]; answers: AT[]; renderExtra?: (q: QT, a: AT | undefined) => React.ReactNode }) {
  const byQ = new Map(answers.map((a) => [a.questionId, a]));
  return (
    <div className="space-y-8">
      {STEPS.map((s) => {
        const qs = questions.filter((q) => q.category === s.title);
        if (!qs.length) return null;
        return (
          <section key={s.title} aria-labelledby={`cat-${s.key}`}>
            <h3 id={`cat-${s.key}`} className="mb-3 border-b border-bege-200 pb-2 text-xl text-oliva-700">{s.title}</h3>
            <div className="space-y-5">
              {qs.map((q) => {
                const a = byQ.get(q.id);
                const parts = answerParts(q, a);
                const answered = isAnswered(q, a);
                const lastRev = a?.revisions?.[0];
                return (
                  <article key={q.id} className="rounded-xl bg-white/70 p-4">
                    <p className="text-sm font-semibold text-salvia-800">{q.number}. {q.text}</p>
                    <div className="mt-2 space-y-1.5 text-[15px] leading-relaxed text-salvia-900">
                      {parts.length === 0 ? (
                        <p className="italic text-terra-600">Não respondida.</p>
                      ) : (
                        parts.map((p, i) => (
                          <p key={i} className="whitespace-pre-wrap break-words">
                            {p.label && <span className="font-semibold text-terra-600">{p.label}: </span>}
                            {p.text}
                          </p>
                        ))
                      )}
                      {!answered && hasContent(a) && <p className="text-xs italic text-terra-600">Resposta incompleta.</p>}
                      {lastRev && <p className="text-xs italic text-salvia-500">Resposta corrigida pela profissional em {fmtDateTime(lastRev.changedAt)}.</p>}
                    </div>
                    {renderExtra?.(q, a)}
                  </article>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
