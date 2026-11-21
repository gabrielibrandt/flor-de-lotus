import Link from "next/link";
import { LogOut, UserRound } from "lucide-react";
import { logoutAction } from "@/app/actions/auth";
import { NotificationBell } from "@/components/NotificationBell";
import { Logo } from "@/components/ui/Logo";
import { bellData } from "@/server/bell";
import { requirePatientPage } from "@/server/session";
import { sweepDeadlines } from "@/server/services/deadlines";

export const dynamic = "force-dynamic";

export default async function PatientLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePatientPage();
  await sweepDeadlines();
  const bell = await bellData(user.id);
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-bege-200 bg-offwhite/90 backdrop-blur no-print">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/paciente" aria-label="Início"><Logo compact /></Link>
          <nav className="flex items-center gap-1">
            <Link href="/paciente" className="btn-ghost btn-sm hidden sm:inline-flex">Início</Link>
            <Link href="/paciente/conta" className="btn-ghost btn-sm" aria-label="Minha conta">
              <UserRound className="h-4 w-4" aria-hidden /><span className="hidden sm:inline">Minha conta</span>
            </Link>
            <NotificationBell count={bell.count} items={bell.items} allHref="/paciente/notificacoes" />
            <form action={logoutAction}>
              <button className="btn-ghost btn-sm" aria-label="Sair"><LogOut className="h-4 w-4" aria-hidden /><span className="hidden sm:inline">Sair</span></button>
            </form>
          </nav>
        </div>
      </header>
      <main id="conteudo" className="mx-auto max-w-5xl px-4 py-8 fade-in">{children}</main>
    </div>
  );
}
