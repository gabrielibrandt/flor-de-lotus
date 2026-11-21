"use client";

import { ActionForm, FormAction, SubmitButton } from "@/components/ui/forms";

export function RequestCorrectionForm({ action, questions }: { action: FormAction; questions: { id: string; number: number; text: string }[] }) {
  return (
    <ActionForm action={action} resetOnSuccess>
      <div>
        <label htmlFor="cr-q" className="label">Pergunta relacionada (opcional)</label>
        <select id="cr-q" name="questionId" className="input">
          <option value="">Geral / mais de uma pergunta</option>
          {questions.map((q) => (
            <option key={q.id} value={q.id}>{q.number}. {q.text.length > 80 ? `${q.text.slice(0, 80)}…` : q.text}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="cr-msg" className="label">O que precisa ser corrigido? <span className="text-terra-500" aria-hidden>*</span></label>
        <textarea id="cr-msg" name="message" className="textarea" required placeholder="Descreva o que estava errado e qual seria a informação correta." />
      </div>
      <SubmitButton className="btn-secondary">Enviar solicitação</SubmitButton>
    </ActionForm>
  );
}

export function ReplyForm({ action }: { action: FormAction }) {
  return (
    <ActionForm action={action} className="mt-3 space-y-3">
      <textarea name="reply" className="textarea" required aria-label="Sua resposta" placeholder="Escreva sua resposta…" />
      <SubmitButton className="btn-primary btn-sm">Responder</SubmitButton>
    </ActionForm>
  );
}
