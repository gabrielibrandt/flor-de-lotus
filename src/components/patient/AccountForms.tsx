"use client";

import { ActionForm, Field, FormAction, SubmitButton } from "@/components/ui/forms";

export function ProfileForm({ action, defaults }: { action: FormAction; defaults: { fullName: string; preferredName: string; email: string } }) {
  return (
    <ActionForm action={action}>
      {(s) => (
        <>
          <Field label="Nome completo" name="fullName" required defaultValue={defaults.fullName} error={s.fieldErrors?.fullName} autoComplete="name" />
          <Field label="Como gosta de ser chamada" name="preferredName" required defaultValue={defaults.preferredName} error={s.fieldErrors?.preferredName} />
          <Field label="E-mail" name="email" type="email" required defaultValue={defaults.email} error={s.fieldErrors?.email} autoComplete="email" />
          <SubmitButton>Salvar dados</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function PasswordForm({ action }: { action: FormAction }) {
  return (
    <ActionForm action={action} resetOnSuccess>
      <Field label="Senha atual" name="current" type="password" required autoComplete="current-password" />
      <Field label="Nova senha" name="password" type="password" required autoComplete="new-password" hint="Mínimo de 8 caracteres, com letras e números." />
      <Field label="Confirme a nova senha" name="confirmPassword" type="password" required autoComplete="new-password" />
      <SubmitButton className="btn-secondary">Alterar senha</SubmitButton>
    </ActionForm>
  );
}

export function DataRequestForm({ action }: { action: FormAction }) {
  return (
    <ActionForm action={action} resetOnSuccess>
      <div>
        <label htmlFor="dr-type" className="label">Tipo de solicitação</label>
        <select id="dr-type" name="type" className="input" defaultValue="ACCESS">
          <option value="ACCESS">Acesso / confirmação dos meus dados</option>
          <option value="CORRECTION">Correção de dados cadastrais</option>
          <option value="DELETION">Exclusão da minha conta e dos meus dados</option>
        </select>
      </div>
      <div>
        <label htmlFor="dr-det" className="label">Detalhes (opcional)</label>
        <textarea id="dr-det" name="details" className="textarea min-h-[90px]" />
      </div>
      <SubmitButton className="btn-secondary">Registrar solicitação</SubmitButton>
    </ActionForm>
  );
}
