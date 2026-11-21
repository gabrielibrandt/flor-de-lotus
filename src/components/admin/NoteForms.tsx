"use client";

import { ActionForm, FormAction, SubmitButton } from "@/components/ui/forms";

export function NoteForm({ action }: { action: FormAction }) {
  return (
    <ActionForm action={action} resetOnSuccess className="space-y-3">
      <label className="sr-only" htmlFor="note">Nova observação privada</label>
      <textarea id="note" name="content" className="textarea min-h-[100px]" placeholder="Observação interna (visível somente para você)" required />
      <SubmitButton className="btn-secondary btn-sm">Salvar observação</SubmitButton>
    </ActionForm>
  );
}
