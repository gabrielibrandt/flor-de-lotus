"use client";

import { useActionState } from "react";
import { ConfirmSubmit, FormMessage, ActionState } from "@/components/ui/forms";

export function SubmitPanel({ action, disabled, lateNote }: { action: (prev: ActionState) => Promise<ActionState>; disabled: boolean; lateNote: string | null }) {
  const [state, formAction] = useActionState(action, {});
  return (
    <form action={formAction} className="card mt-8 flex flex-col items-center gap-4 p-6 text-center">
      <FormMessage state={state} />
      {lateNote && <p className="text-sm text-salvia-600">{lateNote}</p>}
      {disabled ? (
        <button type="button" className="btn-primary" disabled>Enviar anamnese</button>
      ) : (
        <ConfirmSubmit
          confirmLabel="Sim, enviar agora"
          message="Tem certeza de que deseja enviar? Depois do envio, suas respostas ficam registradas e só poderão ser alteradas mediante solicitação de correção à profissional."
        >
          Enviar anamnese
        </ConfirmSubmit>
      )}
    </form>
  );
}
