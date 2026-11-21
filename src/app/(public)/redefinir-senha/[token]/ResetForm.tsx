"use client";
import { ActionForm, Field, FormAction, SubmitButton } from "@/components/ui/forms";

export function ResetForm({ action, token }: { action: FormAction; token: string }) {
  return (
    <ActionForm action={action}>
      <input type="hidden" name="token" value={token} />
      <Field label="Nova senha" name="password" type="password" required autoComplete="new-password" hint="Mínimo de 8 caracteres, com letras e números." />
      <Field label="Confirme a nova senha" name="confirmPassword" type="password" required autoComplete="new-password" />
      <SubmitButton className="btn-primary w-full">Salvar nova senha</SubmitButton>
    </ActionForm>
  );
}
