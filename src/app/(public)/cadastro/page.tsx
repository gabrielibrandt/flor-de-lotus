import { redirect } from "next/navigation";
import { registerAction } from "@/app/actions/auth";
import { AuthCard } from "@/components/AuthCard";
import { RegisterForm } from "@/components/AuthForms";
import { getCurrentUser } from "@/server/session";

export const metadata = { title: "Criar conta" };

export default async function RegisterPage() {
  if (await getCurrentUser()) redirect("/paciente");
  return (
    <AuthCard title="Criar sua conta" subtitle="Leva menos de um minuto. Depois, sua primeira anamnese já estará disponível.">
      <RegisterForm action={registerAction} />
    </AuthCard>
  );
}
