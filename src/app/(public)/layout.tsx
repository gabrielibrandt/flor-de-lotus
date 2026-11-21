import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { getCurrentUser } from "@/server/session";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const area = user ? (user.role === "ADMIN" ? "/admin" : "/paciente") : null;
  return (
    <div className="flex min-h-screen flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5">
        <Link href="/" aria-label="Flor de Lótus — início"><Logo /></Link>
        <nav className="flex items-center gap-2 text-sm">
          {area ? (
            <Link href={area} className="btn-primary btn-sm">Ir para minha área</Link>
          ) : (
            <>
              <Link href="/entrar" className="btn-ghost btn-sm">Entrar</Link>
              <Link href="/cadastro" className="btn-primary btn-sm">Criar conta</Link>
            </>
          )}
        </nav>
      </header>
      <main id="conteudo" className="flex-1">{children}</main>
      <footer className="mt-16 border-t border-bege-200 bg-bege-50">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-8 text-sm text-salvia-600 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Flor de Lótus – Yoga e Ayurveda para Mulheres</p>
          <div className="flex gap-5">
            <Link href="/privacidade" className="hover:text-salvia-800">Política de privacidade</Link>
            <Link href="/acesso-profissional" className="text-salvia-400 hover:text-salvia-700">Acesso profissional</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
