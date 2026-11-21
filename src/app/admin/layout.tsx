import Link from "next/link";
import { LogOut } from "lucide-react";
import { logoutAction } from "@/app/actions/auth";
import { AdminNav } from "@/components/admin/AdminNav";
import { NotificationBell } from "@/components/NotificationBell";
import { Logo } from "@/components/ui/Logo";
import { prisma } from "@/lib/db";
import { bellData } from "@/server/bell";
import { requireAdminPage } from "@/server/session";
import { sweepDeadlines } from "@/server/services/deadlines";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdminPage();
  await sweepDeadlines();
  const [bell, newAnamneses, openRequests] = await Promise.all([
    bellData(admin.id),
    prisma.anamnesis.count({ where: { adminViewedAt: null, status: { in: ["SUBMITTED", "REVIEWED"] } } }),
    Promise.all([
      prisma.correctionRequest.count({ where: { OR: [{ origin: "PATIENT", status: "OPEN" }, { status: "ANSWERED" }] } }),
      prisma.dataRequest.count({ where: { status: "OPEN" } }),
    ]).then(([a, b]) => a + b),
  ]);
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[16rem_1fr]">
      <aside className="border-b border-bege-200 bg-bege-50/80 px-3 py-3 no-print lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r lg:px-4 lg:py-6">
        <div className="mb-3 flex items-center justify-between lg:mb-8 lg:block">
          <Link href="/admin" className="px-2"><Logo compact /></Link>
          <div className="flex items-center gap-1 lg:hidden">
            <NotificationBell count={bell.count} items={bell.items} allHref="/admin/notificacoes" />
            <form action={logoutAction}><button className="btn-ghost btn-sm" aria-label="Sair"><LogOut className="h-4 w-4" aria-hidden /></button></form>
          </div>
        </div>
        <AdminNav badges={{ "/admin/anamneses": newAnamneses, "/admin/solicitacoes": openRequests, "/admin/notificacoes": bell.count }} />
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-30 hidden items-center justify-end gap-2 border-b border-bege-200 bg-offwhite/90 px-8 py-3 backdrop-blur no-print lg:flex">
          <span className="mr-2 text-sm text-salvia-600">{admin.name}</span>
          <NotificationBell count={bell.count} items={bell.items} allHref="/admin/notificacoes" />
          <form action={logoutAction}>
            <button className="btn-ghost btn-sm"><LogOut className="h-4 w-4" aria-hidden /> Sair</button>
          </form>
        </header>
        <main id="conteudo" className="mx-auto max-w-6xl px-4 py-8 sm:px-8 fade-in">{children}</main>
      </div>
    </div>
  );
}
