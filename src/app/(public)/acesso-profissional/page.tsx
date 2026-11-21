import { redirect } from "next/navigation";
import { adminLoginAction } from "@/app/actions/auth";
import { AuthCard } from "@/components/AuthCard";
import { LoginForm } from "@/components/AuthForms";
import { getCurrentUser } from "@/server/session";

export const metadata = { title: "Acesso profissional" };

export default async function AdminLoginPage() {
  const u = await getCurrentUser();
  if (u?.role === "ADMIN") redirect("/admin");
  return (
    <AuthCard title="Acesso profissional" subtitle="Área restrita à profissional responsável.">
      <LoginForm action={adminLoginAction} admin />
    </AuthCard>
  );
}
