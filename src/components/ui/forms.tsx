"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

export type ActionState = { error?: string; ok?: boolean; message?: string; fieldErrors?: Record<string, string>; data?: Record<string, string> };
export type FormAction = (prev: ActionState, formData: FormData) => Promise<ActionState>;

export function SubmitButton({ children, className = "btn-primary", pendingText = "Aguarde…" }: { children: React.ReactNode; className?: string; pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending} aria-busy={pending}>
      {pending ? pendingText : children}
    </button>
  );
}

export function FormMessage({ state }: { state: ActionState }) {
  if (state.error) return <p role="alert" className="rounded-xl bg-terra-400/10 px-4 py-3 text-sm text-terra-700">{state.error}</p>;
  if (state.ok && state.message) return <p role="status" className="rounded-xl bg-salvia-50 px-4 py-3 text-sm text-salvia-700">{state.message}</p>;
  return null;
}

/** Formulário ligado a uma Server Action, com mensagens de erro/sucesso. */
export function ActionForm({
  action, children, className = "space-y-4", resetOnSuccess = false,
}: { action: FormAction; children: React.ReactNode | ((s: ActionState) => React.ReactNode); className?: string; resetOnSuccess?: boolean }) {
  const [state, formAction] = useActionState(action, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (resetOnSuccess && state.ok) ref.current?.reset();
  }, [state, resetOnSuccess]);
  return (
    <form ref={ref} action={formAction} className={className} noValidate>
      <FormMessage state={state} />
      {typeof children === "function" ? children(state) : children}
    </form>
  );
}

export function Field({
  label, name, type = "text", required, defaultValue, hint, error, autoComplete, placeholder,
}: {
  label: string; name: string; type?: string; required?: boolean; defaultValue?: string; hint?: string; error?: string; autoComplete?: string; placeholder?: string;
}) {
  const id = `f-${name}`;
  return (
    <div>
      <label htmlFor={id} className="label">
        {label} {required && <span className="text-terra-500" aria-hidden>*</span>}
      </label>
      <input
        id={id} name={name} type={type} required={required} defaultValue={defaultValue} autoComplete={autoComplete} placeholder={placeholder}
        className="input" aria-invalid={!!error} aria-describedby={error ? `${id}-err` : hint ? `${id}-hint` : undefined}
      />
      {hint && !error && <p id={`${id}-hint`} className="hint">{hint}</p>}
      {error && <p id={`${id}-err`} className="error-text">{error}</p>}
    </div>
  );
}

/** Botão que pede confirmação antes de enviar o formulário que o contém. */
export function ConfirmSubmit({
  children, message, className = "btn-primary", confirmLabel = "Confirmar",
}: { children: React.ReactNode; message: string; className?: string; confirmLabel?: string }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const { pending } = useFormStatus();
  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)} disabled={pending}>
        {pending ? "Aguarde…" : children}
      </button>
      {open && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-salvia-900/30 p-4 fade-in">
          <div className="card max-w-md w-full p-6">
            <p className="text-salvia-800 leading-relaxed">{message}</p>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>Voltar</button>
              <button
                ref={btnRef}
                type="submit"
                className={className.includes("danger") ? "btn-danger" : "btn-primary"}
                onClick={() => setTimeout(() => setOpen(false), 0)}
              >
                {confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
