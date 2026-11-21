"use client";

import { useActionState, useEffect } from "react";
import { ActionForm, ActionState, FormAction, FormMessage, SubmitButton } from "@/components/ui/forms";
import { parseConfig } from "@/lib/answers";
import type { ChoiceConfig, CompositeConfig } from "@/lib/questions";

type Q = { id: string; number: number; fieldType: string; config: string | null; allowNotApplicable: boolean; allowPreferNot: boolean };

export function CorrectAnswerForm({
  action, q, current, skipReason, requests,
}: { action: FormAction; q: Q; current: Record<string, string> | string; skipReason: string | null; requests: { id: string; label: string }[] }) {
  const obj = typeof current === "string" ? {} : current;
  const text = typeof current === "string" ? current : "";
  return (
    <details className="mt-3 rounded-xl border border-bege-200 bg-bege-50/60 p-3">
      <summary className="cursor-pointer text-xs font-semibold text-salvia-600">Corrigir resposta</summary>
      <ActionForm action={action} className="mt-3 space-y-3">
        {(q.fieldType === "long_text" || q.fieldType === "short_text") && (
          <textarea name="value" defaultValue={text} className="textarea" aria-label="Nova resposta" />
        )}
        {q.fieldType === "composite" &&
          (parseConfig<CompositeConfig>(q)?.fields ?? []).map((f) => (
            <div key={f.key}>
              <label className="label text-xs" htmlFor={`c-${q.id}-${f.key}`}>{f.label}</label>
              <input id={`c-${q.id}-${f.key}`} name={`f_${f.key}`} type={f.type === "date" ? "date" : "text"} defaultValue={obj[f.key] ?? ""} className="input" />
            </div>
          ))}
        {q.fieldType === "choice" && (
          <>
            <select name="option" defaultValue={obj.option ?? ""} className="input" aria-label="Opção">
              <option value="">(sem resposta)</option>
              {parseConfig<ChoiceConfig>(q)?.options.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
            <textarea name="details" defaultValue={obj.details ?? ""} className="textarea min-h-[80px]" aria-label="Detalhes" />
          </>
        )}
        {(q.allowNotApplicable || q.allowPreferNot) && (
          <select name="skipReason" defaultValue={skipReason ?? ""} className="input" aria-label="Marcação especial">
            <option value="">Resposta normal</option>
            {q.allowNotApplicable && <option value="NOT_APPLICABLE">Não se aplica</option>}
            {q.allowPreferNot && <option value="PREFER_NOT_TO_ANSWER">Prefiro não responder</option>}
          </select>
        )}
        {requests.length > 0 && (
          <select name="correctionRequestId" className="input" aria-label="Solicitação relacionada" defaultValue="">
            <option value="">Sem solicitação vinculada</option>
            {requests.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
          </select>
        )}
        <input name="reason" className="input" placeholder="Motivo da correção (obrigatório)" required />
        <SubmitButton className="btn-primary btn-sm">Salvar correção</SubmitButton>
      </ActionForm>
    </details>
  );
}

export function ConsultationForm({ action, hasAppointment }: { action: FormAction; hasAppointment: boolean }) {
  return (
    <ActionForm action={action} className="grid gap-3 sm:grid-cols-[1fr_9rem_auto] sm:items-end">
      <div><label className="label" htmlFor="c-date">Data da consulta</label><input id="c-date" type="date" name="date" className="input" required /></div>
      <div><label className="label" htmlFor="c-time">Horário</label><input id="c-time" type="time" name="time" className="input" required /></div>
      <SubmitButton className="btn-primary">Definir</SubmitButton>
      {!hasAppointment && (
        <label className="flex items-center gap-2 text-sm text-salvia-700 sm:col-span-3">
          <input type="checkbox" name="addToAgenda" defaultChecked className="h-4 w-4 accent-salvia-600" /> Adicionar também à agenda
        </label>
      )}
    </ActionForm>
  );
}

export function ClarificationForm({ action, questions }: { action: FormAction; questions: { id: string; number: number }[] }) {
  return (
    <ActionForm action={action} resetOnSuccess className="space-y-3">
      <select name="questionId" className="input" aria-label="Pergunta" defaultValue="">
        <option value="">Geral</option>
        {questions.map((q) => <option key={q.id} value={q.id}>Pergunta {q.number}</option>)}
      </select>
      <textarea name="message" className="textarea min-h-[90px]" placeholder="O que você gostaria que a paciente esclarecesse ou corrigisse?" required />
      <SubmitButton className="btn-secondary btn-sm">Enviar pedido à paciente</SubmitButton>
    </ActionForm>
  );
}

export function ResolveForm({ action }: { action: FormAction }) {
  return (
    <ActionForm action={action} className="mt-3 space-y-2">
      <textarea name="resolution" className="textarea min-h-[70px]" placeholder="Retorno para a paciente (opcional)" />
      <div className="flex flex-wrap gap-2">
        <button name="outcome" value="RESOLVED" className="btn-primary btn-sm">Marcar como resolvida</button>
        <button name="outcome" value="REJECTED" className="btn-ghost btn-sm">Não aceitar</button>
      </div>
    </ActionForm>
  );
}

export function ReportButtons({ full, summary }: { full: (p: ActionState) => Promise<ActionState>; summary: (p: ActionState) => Promise<ActionState> }) {
  return (
    <div className="flex flex-wrap gap-2">
      <GenButton action={full} label="Gerar PDF completo" />
      <GenButton action={summary} label="Gerar PDF resumido" />
    </div>
  );
}

function GenButton({ action, label }: { action: (p: ActionState) => Promise<ActionState>; label: string }) {
  const [state, formAction] = useActionState(action, {});
  useEffect(() => {
    if (state.ok && state.data?.reportId) window.location.href = `/api/admin/relatorios/${state.data.reportId}`;
  }, [state]);
  return (
    <form action={formAction}>
      {state.error && <FormMessage state={state} />}
      <SubmitButton className="btn-secondary btn-sm" pendingText="Gerando…">{label}</SubmitButton>
    </form>
  );
}
