"use client";

import Link from "next/link";
import { forgotPasswordAction } from "@/app/actions/auth";
import { ActionForm, Field, SubmitButton } from "@/components/ui/forms";
import { LotusIcon } from "@/components/ui/Logo";

export default function ForgotPasswordPage() {
  return (
    <div className="mx-auto max-w-md px-5 py-10 fade-in">
      <div className="card p-7 sm:p-9">
        <LotusIcon className="mx-auto h-10 w-14" />
        <h1 className="mt-3 text-center text-3xl">Recuperar senha</h1>
        <p className="mt-3 text-sm leading-relaxed text-salvia-600">
          Por segurança e privacidade, a plataforma não envia e-mails automáticos. Informe seu e-mail: a profissional
          receberá o pedido e enviará a você, pelo canal de contato habitual, um link pessoal (válido por 24 horas) para criar uma nova senha.
        </p>
        <div className="mt-6">
          <ActionForm action={forgotPasswordAction}>
            {(s) =>
              s.ok ? (
                <Link href="/entrar" className="btn-secondary w-full">Voltar ao login</Link>
              ) : (
                <>
                  <Field label="E-mail da conta" name="email" type="email" required autoComplete="email" />
                  <SubmitButton className="btn-primary w-full">Enviar pedido</SubmitButton>
                  <p className="text-center text-sm"><Link href="/entrar" className="link">Voltar</Link></p>
                </>
              )
            }
          </ActionForm>
        </div>
      </div>
    </div>
  );
}
