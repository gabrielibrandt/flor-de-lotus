"use client";

import Link from "next/link";
import { ActionForm, Field, SubmitButton, FormAction } from "@/components/ui/forms";

export function LoginForm({ action, next, admin = false }: { action: FormAction; next?: string; admin?: boolean }) {
  return (
    <ActionForm action={action}>
      {(s) => (
        <>
          {next && <input type="hidden" name="next" value={next} />}
          <Field label="E-mail" name="email" type="email" required autoComplete="email" defaultValue={s.data?.email} />
          <Field label="Senha" name="password" type="password" required autoComplete="current-password" />
          <SubmitButton className="btn-primary w-full" pendingText="Entrando…">Entrar</SubmitButton>
          {!admin && (
            <div className="flex flex-col gap-2 pt-2 text-center text-sm sm:flex-row sm:justify-between">
              <Link href="/recuperar-senha" className="link">Esqueci minha senha</Link>
              <Link href="/cadastro" className="link">Ainda não tenho conta</Link>
            </div>
          )}
        </>
      )}
    </ActionForm>
  );
}

export function RegisterForm({ action }: { action: FormAction }) {
  return (
    <ActionForm action={action}>
      {(s) => (
        <>
          <Field label="Nome completo" name="fullName" required autoComplete="name" defaultValue={s.data?.fullName} error={s.fieldErrors?.fullName} />
          <Field label="Como gosta de ser chamada" name="preferredName" required autoComplete="nickname" defaultValue={s.data?.preferredName} error={s.fieldErrors?.preferredName} />
          <Field label="E-mail" name="email" type="email" required autoComplete="email" defaultValue={s.data?.email} error={s.fieldErrors?.email} />
          <Field label="Senha" name="password" type="password" required autoComplete="new-password" hint="Mínimo de 8 caracteres, com letras e números." error={s.fieldErrors?.password} />
          <Field label="Confirmação de senha" name="confirmPassword" type="password" required autoComplete="new-password" error={s.fieldErrors?.confirmPassword} />
          <div>
            <label className="flex items-start gap-3 text-sm text-salvia-700">
              <input type="checkbox" name="consent" className="mt-1 h-4 w-4 accent-salvia-600" />
              <span>
                Li e concordo com a <Link href="/privacidade" target="_blank" className="link">Política de Privacidade</Link> e autorizo o
                tratamento dos meus dados pessoais, inclusive dados de saúde, para fins exclusivos do meu atendimento na Flor de Lótus.
              </span>
            </label>
            {s.fieldErrors?.consent && <p className="error-text">{s.fieldErrors.consent}</p>}
          </div>
          <SubmitButton className="btn-primary w-full" pendingText="Criando sua conta…">Criar minha conta</SubmitButton>
          <p className="text-center text-sm">Já tem conta? <Link href="/entrar" className="link">Entrar</Link></p>
        </>
      )}
    </ActionForm>
  );
}
