import { redirect } from "next/navigation";
import { loginAction } from "@/app/actions/auth";
import { AuthCard } from "@/components/AuthCard";
import { LoginForm } from "@/components/AuthForms";
import { getCurrentUser } from "@/server/session";

export const metadata = { title: "Entrar" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; senha?: string }> }) {
  const sp = await searchParams;
  const u = await getCurrentUser();
  if (u) redirect(u.role === "ADMIN" ? "/admin" : "/paciente");
  return (
    <AuthCard title="Área da paciente" subtitle="Entre para preencher e acompanhar suas anamneses.">
      {sp.senha === "redefinida" && (
        <p role="status" className="mb-4 rounded-xl bg-salvia-50 px-4 py-3 text-sm text-salvia-700">Senha redefinida. Entre com a nova senha.</p>
      )}
      <LoginForm action={loginAction} next={sp.next} />
    </AuthCard>
  );
}
