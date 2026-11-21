"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft, ChevronRight, CloudOff, Loader2, Save } from "lucide-react";
import { saveAnswersAction } from "@/app/actions/patient";
import { isAnswered, parseConfig } from "@/lib/answers";
import type { ChoiceConfig, CompositeConfig } from "@/lib/questions";

export type QView = {
  id: string; number: number; text: string; helpText: string | null; fieldType: string; config: string | null;
  required: boolean; allowNotApplicable: boolean; allowPreferNot: boolean;
};
export type StepView = { title: string; questions: QView[] };
export type AnswerState = { value: string | Record<string, string>; skipReason: string | null };

type SaveStatus = { kind: "idle" | "pending" | "saving" | "saved" | "error"; at?: string; message?: string };

function toStored(a: AnswerState | undefined) {
  if (!a) return null;
  return { value: typeof a.value === "string" ? a.value : JSON.stringify(a.value), skipReason: a.skipReason };
}

export function Questionnaire({
  anamnesisId, steps, initial, initialStep, prefillDirty, deadlineLabel,
}: {
  anamnesisId: string; steps: StepView[]; initial: Record<string, AnswerState>; initialStep: number; prefillDirty: string[]; deadlineLabel: string | null;
}) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, AnswerState>>(initial);
  const [step, setStep] = useState(Math.min(Math.max(initialStep, 0), steps.length - 1));
  const [status, setStatus] = useState<SaveStatus>({ kind: "idle" });
  const [showMissing, setShowMissing] = useState(false);
  const [busy, setBusy] = useState(false);
  const dirty = useRef<Set<string>>(new Set(prefillDirty));
  const answersRef = useRef(answers);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saving = useRef<Promise<boolean> | null>(null);
  const topRef = useRef<HTMLDivElement>(null);

  answersRef.current = answers;
  const allQuestions = useMemo(() => steps.flatMap((s) => s.questions), [steps]);
  const answeredCount = allQuestions.filter((q) => isAnswered(q, toStored(answers[q.id]))).length;
  const pct = Math.round((answeredCount / allQuestions.length) * 100);

  const flush = useCallback(async (): Promise<boolean> => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    if (saving.current) await saving.current;
    if (dirty.current.size === 0) return true;
    const ids = [...dirty.current];
    dirty.current.clear();
    const items = ids.map((id) => ({ questionId: id, value: answersRef.current[id]?.value ?? "", skipReason: answersRef.current[id]?.skipReason ?? null }));
    setStatus({ kind: "saving" });
    const p = (async () => {
      try {
        const r = await saveAnswersAction(anamnesisId, items);
        if (r.ok) {
          setStatus({ kind: "saved", at: new Date(r.savedAt!).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) });
          return true;
        }
        if (r.locked) { router.refresh(); }
        ids.forEach((id) => dirty.current.add(id));
        setStatus({ kind: "error", message: r.error });
        return false;
      } catch {
        ids.forEach((id) => dirty.current.add(id));
        setStatus({ kind: "error", message: "Sem conexão. Suas respostas serão salvas assim que a conexão voltar." });
        return false;
      }
    })();
    saving.current = p;
    const ok = await p;
    saving.current = null;
    return ok;
  }, [anamnesisId, router]);

  const schedule = useCallback(() => {
    setStatus({ kind: "pending" });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { void flush(); }, 1200);
  }, [flush]);

  useEffect(() => {
    if (prefillDirty.length) schedule();
    const onUnload = (e: BeforeUnloadEvent) => {
      if (dirty.current.size > 0) { e.preventDefault(); e.returnValue = ""; }
    };
    const onOnline = () => { if (dirty.current.size) void flush(); };
    window.addEventListener("beforeunload", onUnload);
    window.addEventListener("online", onOnline);
    const retry = setInterval(() => { if (dirty.current.size && !timer.current && !saving.current) void flush(); }, 15000);
    return () => { window.removeEventListener("beforeunload", onUnload); window.removeEventListener("online", onOnline); clearInterval(retry); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const update = (qid: string, next: Partial<AnswerState>) => {
    setAnswers((prev) => {
      const cur = prev[qid] ?? { value: "", skipReason: null };
      return { ...prev, [qid]: { ...cur, ...next } };
    });
    dirty.current.add(qid);
    schedule();
  };

  const goTo = async (i: number) => {
    if (busy) return;
    setBusy(true);
    try {
      await flush();
    } finally {
      setBusy(false);
    }
    setStep(i);
    setShowMissing(false);
    const url = new URL(window.location.href);
    url.searchParams.set("etapa", String(i + 1));
    window.history.replaceState(null, "", url.toString());
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const current = steps[step];
  const missingHere = current.questions.filter((q) => q.required && !isAnswered(q, toStored(answers[q.id])));

  const next = async () => {
    if (missingHere.length && !showMissing) { setShowMissing(true); }
    if (step < steps.length - 1) await goTo(step + 1);
  };

  const toReview = async () => {
    const ok = await flush();
    if (ok) router.push(`/paciente/anamneses/${anamnesisId}/revisao`);
  };

  const saveAndExit = async () => {
    const ok = await flush();
    if (ok) router.push("/paciente");
  };

  return (
    <div ref={topRef} className="scroll-mt-24">
      {/* Progresso */}
      <div className="card z-20 mb-6 p-4 sm:sticky sm:top-[4.25rem] sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <p className="font-semibold text-salvia-800">
            Etapa {step + 1} de {steps.length}: <span className="font-serif text-lg">{current.title}</span>
          </p>
          <SaveIndicator status={status} />
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-bege-100" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Perguntas respondidas">
          <div className="h-full rounded-full bg-salvia-500 transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-salvia-500">
          <span>{answeredCount} de {allQuestions.length} perguntas respondidas</span>
          {deadlineLabel && <span>{deadlineLabel}</span>}
        </div>
        <nav aria-label="Etapas" className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
          {steps.map((s, i) => {
            const done = s.questions.every((q) => !q.required || isAnswered(q, toStored(answers[q.id])));
            return (
              <button
                key={s.title}
                type="button"
                onClick={() => goTo(i)}
                aria-current={i === step ? "step" : undefined}
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition ${
                  i === step ? "bg-salvia-600 text-white" : done ? "bg-salvia-100 text-salvia-700" : "bg-bege-100 text-salvia-600 hover:bg-bege-200"
                }`}
              >
                {done && i !== step && <Check className="mr-1 inline h-3 w-3" aria-hidden />}
                {i + 1}. {s.title}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Perguntas da etapa */}
      <div className="space-y-6">
        {current.questions.map((q) => (
          <QuestionField
            key={q.id}
            q={q}
            answer={answers[q.id]}
            onChange={(n) => update(q.id, n)}
            onBlur={() => { void flush(); }}
            highlight={showMissing && missingHere.includes(q)}
          />
        ))}
      </div>

      {showMissing && missingHere.length > 0 && (
        <p role="alert" className="mt-6 rounded-xl bg-bege-100 px-4 py-3 text-sm text-terra-700">
          Algumas perguntas obrigatórias desta etapa ainda estão em branco. Você pode seguir e voltar depois — o envio só é liberado quando todas estiverem respondidas.
        </p>
      )}

      {/* Navegação */}
      <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2">
          <button type="button" className="btn-ghost" onClick={() => goTo(step - 1)} disabled={step === 0 || busy}>
            <ChevronLeft className="h-4 w-4" aria-hidden /> Voltar
          </button>
          <button type="button" className="btn-ghost" onClick={saveAndExit}>
            <Save className="h-4 w-4" aria-hidden /> Salvar e continuar depois
          </button>
        </div>
        {step < steps.length - 1 ? (
          <button type="button" className="btn-primary" onClick={next} disabled={busy}>
            Avançar <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        ) : (
          <button type="button" className="btn-primary" onClick={toReview}>
            Revisar respostas <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        )}
      </div>
    </div>
  );
}

function SaveIndicator({ status }: { status: SaveStatus }) {
  const base = "inline-flex items-center gap-1.5 text-xs";
  if (status.kind === "saving") return <span className={`${base} text-salvia-500`} aria-live="polite"><Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> Salvando…</span>;
  if (status.kind === "pending") return <span className={`${base} text-salvia-400`} aria-live="polite">Alterações não salvas…</span>;
  if (status.kind === "saved") return <span className={`${base} text-salvia-600`} aria-live="polite"><Check className="h-3.5 w-3.5" aria-hidden /> Salvo às {status.at}</span>;
  if (status.kind === "error") return <span className={`${base} text-terra-600`} role="alert"><CloudOff className="h-3.5 w-3.5" aria-hidden /> {status.message}</span>;
  return <span className={`${base} text-salvia-400`}>Salvamento automático ativado</span>;
}

function AutoTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(el.scrollHeight, 140)}px`;
  }, [props.value]);
  return <textarea ref={ref} {...props} className={`textarea resize-none ${props.className ?? ""}`} />;
}

export function QuestionField({
  q, answer, onChange, onBlur, highlight,
}: { q: QView; answer?: AnswerState; onChange: (n: Partial<AnswerState>) => void; onBlur: () => void; highlight?: boolean }) {
  const skip = answer?.skipReason ?? null;
  const val = answer?.value ?? (q.fieldType === "composite" || q.fieldType === "choice" ? {} : "");
  const obj = (typeof val === "string" ? {} : val) as Record<string, string>;
  const str = typeof val === "string" ? val : "";
  const id = `q${q.number}`;
  const disabled = !!skip;

  return (
    <fieldset className={`card p-5 sm:p-6 ${highlight ? "ring-2 ring-terra-400/50" : ""}`} aria-describedby={q.helpText ? `${id}-help` : undefined}>
      <legend className="sr-only">Pergunta {q.number}</legend>
      <p className="text-[15px] font-semibold leading-relaxed text-salvia-800">
        <span className="mr-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-salvia-100 text-xs font-bold text-salvia-700">{q.number}</span>
        {q.text} {q.required && <span className="text-terra-500" title="Obrigatória" aria-label="obrigatória">*</span>}
      </p>
      {q.helpText && <p id={`${id}-help`} className="hint mt-2">{q.helpText}</p>}

      <div className={`mt-4 space-y-4 ${disabled ? "opacity-50" : ""}`}>
        {q.fieldType === "short_text" && (
          <input id={id} className="input" value={str} disabled={disabled} onChange={(e) => onChange({ value: e.target.value })} onBlur={onBlur} aria-label={`Resposta da pergunta ${q.number}`} />
        )}
        {q.fieldType === "long_text" && (
          <AutoTextarea id={id} value={str} disabled={disabled} onChange={(e) => onChange({ value: e.target.value })} onBlur={onBlur} aria-label={`Resposta da pergunta ${q.number}`} placeholder="Escreva com suas palavras…" />
        )}
        {q.fieldType === "composite" && (
          <div className="grid gap-4 sm:grid-cols-2">
            {(parseConfig<CompositeConfig>(q)?.fields ?? []).map((f) => (
              <div key={f.key} className={f.type === "textarea" ? "sm:col-span-2" : ""}>
                <label htmlFor={`${id}-${f.key}`} className="label">{f.label} {f.required && <span className="text-terra-500" aria-hidden>*</span>}</label>
                <input
                  id={`${id}-${f.key}`} type={f.type === "date" ? "date" : "text"} className="input" disabled={disabled}
                  value={obj[f.key] ?? ""} onBlur={onBlur}
                  max={f.type === "date" ? new Date().toISOString().slice(0, 10) : undefined}
                  onChange={(e) => onChange({ value: { ...obj, [f.key]: e.target.value } })}
                />
              </div>
            ))}
          </div>
        )}
        {q.fieldType === "choice" && (() => {
          const cfg = parseConfig<ChoiceConfig>(q);
          return (
            <>
              <div role="radiogroup" aria-label={`Opções da pergunta ${q.number}`} className="flex flex-wrap gap-2">
                {cfg?.options.map((opt) => {
                  const checked = obj.option === opt;
                  return (
                    <label key={opt} className={`cursor-pointer rounded-full border px-4 py-2 text-sm font-semibold transition ${checked ? "border-salvia-600 bg-salvia-600 text-white" : "border-bege-300 bg-white text-salvia-700 hover:bg-bege-50"}`}>
                      <input type="radio" className="sr-only" name={id} value={opt} checked={checked} disabled={disabled}
                        onChange={() => { onChange({ value: { ...obj, option: opt } }); }} onBlur={onBlur} />
                      {opt}
                    </label>
                  );
                })}
              </div>
              {cfg?.detailsLabel && (
                <div>
                  <label htmlFor={`${id}-det`} className="label">
                    {cfg.detailsLabel} {cfg.detailsRequiredFor?.includes(obj.option ?? "") && <span className="text-terra-500" aria-hidden>*</span>}
                  </label>
                  <AutoTextarea id={`${id}-det`} value={obj.details ?? ""} disabled={disabled} onBlur={onBlur}
                    onChange={(e) => onChange({ value: { ...obj, details: e.target.value } })} />
                </div>
              )}
            </>
          );
        })()}
      </div>

      {(q.allowNotApplicable || q.allowPreferNot) && (
        <div className="mt-4 flex flex-wrap gap-4 border-t border-bege-100 pt-3 text-sm text-salvia-600">
          {q.allowNotApplicable && (
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" className="h-4 w-4 accent-salvia-600" checked={skip === "NOT_APPLICABLE"}
                onChange={(e) => onChange({ skipReason: e.target.checked ? "NOT_APPLICABLE" : null })} />
              Não se aplica
            </label>
          )}
          {q.allowPreferNot && (
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" className="h-4 w-4 accent-salvia-600" checked={skip === "PREFER_NOT_TO_ANSWER"}
                onChange={(e) => onChange({ skipReason: e.target.checked ? "PREFER_NOT_TO_ANSWER" : null })} />
              Prefiro não responder
            </label>
          )}
        </div>
      )}
    </fieldset>
  );
}
