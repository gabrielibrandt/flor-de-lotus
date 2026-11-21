"use client";

import { useActionState, useState } from "react";
import { ActionState, FormMessage, SubmitButton } from "@/components/ui/forms";

export function ResetLinkButton({ action, requested }: { action: (p: ActionState) => Promise<ActionState>; requested: boolean }) {
  const [state, formAction] = useActionState(action, {});
  const [copied, setCopied] = useState(false);
  return (
    <form action={formAction} className="space-y-3">
      {requested && !state.ok && <p className="rounded-lg bg-bege-100 px-3 py-2 text-xs text-terra-700">A paciente pediu ajuda para redefinir a senha.</p>}
      <FormMessage state={state} />
      {state.data?.link ? (
        <div className="space-y-2">
          <input readOnly value={state.data.link} className="input text-xs" onFocus={(e) => e.currentTarget.select()} aria-label="Link de redefinição" />
          <button type="button" className="btn-secondary btn-sm" onClick={async () => { await navigator.clipboard.writeText(state.data!.link); setCopied(true); }}>
            {copied ? "Copiado!" : "Copiar link"}
          </button>
        </div>
      ) : (
        <SubmitButton className="btn-secondary btn-sm">Gerar link de redefinição de senha</SubmitButton>
      )}
    </form>
  );
}
