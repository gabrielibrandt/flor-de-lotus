import Link from "next/link";
import { resetPasswordAction } from "@/app/actions/auth";
import { AuthCard } from "@/components/AuthCard";
import { ResetForm } from "./ResetForm";
import { findValidResetToken } from "@/server/services/accounts";

export const metadata = { title: "Nova senha" };

export default async function ResetPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const valid = await findValidResetToken(token);
  return (
    <AuthCard title="Criar nova senha">
      {valid ? (
        <ResetForm action={resetPasswordAction} token={token} />
      ) : (
        <div className="space-y-4 text-center">
          <p className="text-salvia-700">Este link é inválido, já foi usado ou expirou.</p>
          <Link href="/recuperar-senha" className="btn-secondary">Pedir novo link</Link>
        </div>
      )}
    </AuthCard>
  );
}
