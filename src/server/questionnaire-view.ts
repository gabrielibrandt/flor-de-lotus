import "server-only";
import { parseStructured } from "@/lib/answers";
import { STEPS } from "@/lib/questions";
import type { AnswerState, QView, StepView } from "@/components/questionnaire/Questionnaire";

type Q = QView & { category: string };
type A = { questionId: string; value: string; skipReason: string | null };

export function buildSteps(questions: Q[]): StepView[] {
  return STEPS.map((s) => ({
    title: s.title,
    questions: questions.filter((q) => q.category === s.title).map(({ category: _c, ...q }) => q),
  })).filter((s) => s.questions.length);
}

export function buildInitialAnswers(questions: Q[], answers: A[]): Record<string, AnswerState> {
  const byQ = new Map(answers.map((a) => [a.questionId, a]));
  const out: Record<string, AnswerState> = {};
  for (const q of questions) {
    const a = byQ.get(q.id);
    if (!a) continue;
    out[q.id] = {
      value: q.fieldType === "composite" || q.fieldType === "choice" ? parseStructured(a.value) : a.value,
      skipReason: a.skipReason,
    };
  }
  return out;
}

export function toQView(q: { id: string; number: number; text: string; helpText: string | null; fieldType: string; config: string | null; required: boolean; allowNotApplicable: boolean; allowPreferNot: boolean; category: string }): Q {
  return {
    id: q.id, number: q.number, text: q.text, helpText: q.helpText, fieldType: q.fieldType, config: q.config,
    required: q.required, allowNotApplicable: q.allowNotApplicable, allowPreferNot: q.allowPreferNot, category: q.category,
  };
}
