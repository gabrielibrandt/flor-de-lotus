import { SKIP_LABEL, SkipReason } from "./constants";
import type { ChoiceConfig, CompositeConfig } from "./questions";

export type QuestionLike = {
  id: string;
  number: number;
  text: string;
  fieldType: string;
  config: string | null;
  required: boolean;
  allowNotApplicable: boolean;
  allowPreferNot: boolean;
};
export type AnswerLike = { value: string; skipReason: string | null } | null | undefined;

export function parseConfig<T = CompositeConfig | ChoiceConfig>(q: { config: string | null }): T | null {
  if (!q.config) return null;
  try {
    return JSON.parse(q.config) as T;
  } catch {
    return null;
  }
}

export function parseStructured(value: string): Record<string, string> {
  if (!value) return {};
  try {
    const v = JSON.parse(value);
    if (v && typeof v === "object" && !Array.isArray(v)) {
      return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, typeof x === "string" ? x : String(x ?? "")]));
    }
  } catch {
    /* valor não estruturado */
  }
  return {};
}

const MAX_LEN = 20000;

/** Normaliza e valida o valor recebido do formulário conforme o tipo da pergunta. */
export function normalizeAnswerValue(q: QuestionLike, raw: unknown): string {
  if (q.fieldType === "short_text" || q.fieldType === "long_text") {
    const s = typeof raw === "string" ? raw : "";
    return s.slice(0, MAX_LEN);
  }
  const obj = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  if (q.fieldType === "composite") {
    const cfg = parseConfig<CompositeConfig>(q);
    const out: Record<string, string> = {};
    for (const f of cfg?.fields ?? []) {
      const v = obj[f.key];
      let s = typeof v === "string" ? v.slice(0, MAX_LEN) : "";
      if (f.type === "date" && s && !/^\d{4}-\d{2}-\d{2}$/.test(s)) s = "";
      out[f.key] = s;
    }
    return JSON.stringify(out);
  }
  if (q.fieldType === "choice") {
    const cfg = parseConfig<ChoiceConfig>(q);
    const option = typeof obj.option === "string" && cfg?.options.includes(obj.option) ? obj.option : "";
    const details = typeof obj.details === "string" ? obj.details.slice(0, MAX_LEN) : "";
    return JSON.stringify({ option, details });
  }
  return "";
}

export function isSkipAllowed(q: QuestionLike, reason: string | null | undefined): reason is SkipReason {
  if (reason === "NOT_APPLICABLE") return q.allowNotApplicable;
  if (reason === "PREFER_NOT_TO_ANSWER") return q.allowPreferNot;
  return false;
}

/** A pergunta está respondida de forma completa? */
export function isAnswered(q: QuestionLike, a: AnswerLike): boolean {
  if (!a) return false;
  if (a.skipReason) return isSkipAllowed(q, a.skipReason);
  if (q.fieldType === "short_text" || q.fieldType === "long_text") return a.value.trim().length > 0;
  const data = parseStructured(a.value);
  if (q.fieldType === "composite") {
    const cfg = parseConfig<CompositeConfig>(q);
    const fields = cfg?.fields ?? [];
    return fields.filter((f) => f.required).every((f) => (data[f.key] ?? "").trim().length > 0)
      && fields.some((f) => (data[f.key] ?? "").trim().length > 0);
  }
  if (q.fieldType === "choice") {
    const cfg = parseConfig<ChoiceConfig>(q);
    if (!data.option) return false;
    if (cfg?.detailsRequiredFor?.includes(data.option)) return (data.details ?? "").trim().length > 0;
    return true;
  }
  return false;
}

/** Tem algum conteúdo (mesmo incompleto)? */
export function hasContent(a: AnswerLike): boolean {
  if (!a) return false;
  if (a.skipReason) return true;
  if (!a.value) return false;
  const data = parseStructured(a.value);
  if (Object.keys(data).length) return Object.values(data).some((v) => v.trim().length > 0);
  return a.value.trim().length > 0;
}

function fmtIsoDate(s: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : s;
}

export type AnswerPart = { label?: string; text: string };

/** Representação textual fiel da resposta (sem reescrever o conteúdo da paciente). */
export function answerParts(q: QuestionLike, a: AnswerLike): AnswerPart[] {
  if (!a || !hasContent(a)) return [];
  if (a.skipReason) return [{ text: SKIP_LABEL[a.skipReason as SkipReason] ?? a.skipReason }];
  if (q.fieldType === "short_text" || q.fieldType === "long_text") return [{ text: a.value }];
  const data = parseStructured(a.value);
  if (q.fieldType === "composite") {
    const cfg = parseConfig<CompositeConfig>(q);
    return (cfg?.fields ?? []).map((f) => ({
      label: f.label,
      text: f.type === "date" ? fmtIsoDate(data[f.key] ?? "") : (data[f.key] ?? ""),
    })).map((p) => ({ ...p, text: p.text || "(não informado)" }));
  }
  if (q.fieldType === "choice") {
    const parts: AnswerPart[] = [{ label: "Resposta", text: data.option || "(não informado)" }];
    if ((data.details ?? "").trim()) parts.push({ label: "Detalhes", text: data.details });
    return parts;
  }
  return [{ text: a.value }];
}

export function answerToPlainText(q: QuestionLike, a: AnswerLike): string {
  const parts = answerParts(q, a);
  if (!parts.length) return "";
  return parts.map((p) => (p.label ? `${p.label}: ${p.text}` : p.text)).join("\n");
}

export function skipLabel(reason: string | null): string | null {
  return reason ? SKIP_LABEL[reason as SkipReason] ?? reason : null;
}
