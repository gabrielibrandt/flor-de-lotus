"use client";

import { ActionForm, FormAction, SubmitButton } from "@/components/ui/forms";

export function DeletePatientForm({ action, email }: { action: FormAction; email: string }) {
  return (
    <details className="rounded-xl border border-terra-400/30 p-4">
      <summary className="cursor-pointer text-sm font-semibold text-terra-700">Excluir conta e dados da paciente</summary>
      <p className="mt-3 text-sm text-salvia-700">
        Ação irreversível: remove cadastro, anamneses, respostas, observações e relatórios. Compromissos da agenda são mantidos sem dados pessoais.
        Antes de excluir, verifique se há obrigação legal de guarda das informações.
      </p>
      <ActionForm action={action} className="mt-3 space-y-3">
        <label className="label" htmlFor="confirmEmail">Para confirmar, digite o e-mail da paciente ({email})</label>
        <input id="confirmEmail" name="confirmEmail" className="input" autoComplete="off" />
        <SubmitButton className="btn-danger btn-sm">Excluir definitivamente</SubmitButton>
      </ActionForm>
    </details>
  );
}
