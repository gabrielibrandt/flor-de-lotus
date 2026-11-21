import Link from "next/link";
import { AlertTriangle, Bell, CalendarDays, ClipboardCheck, ClipboardList, Hourglass, Inbox, Users } from "lucide-react";
import { STATUS_LABEL, DisplayStatus } from "@/lib/constants";
import { fmtDateTime, fmtLong } from "@/lib/dates";
import { displayStatus } from "@/lib/status";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState, PageHeader } from "@/components/ui/PageHeader";
import { dashboardStats } from "@/server/admin-queries";
import { requireAdminPage } from "@/server/session";

export const metadata = { title: "Visão geral" };

export default async function AdminDashboard() {
  const admin = await requireAdminPage();
  const s = await dashboardStats(admin.id);
  const cards = [
    { label: "Pacientes cadastradas", value: s.patients, icon: Users, href: "/admin/pacientes" },
    { label: "Anamneses recebidas", value: s.received, icon: ClipboardCheck, href: "/admin/anamneses?situacao=SUBMITTED", extra: s.unseen ? `${s.unseen} nova(s)` : undefined },
    { label: "Pendentes", value: s.pending, icon: ClipboardList, href: "/admin/anamneses?situacao=NOT_STARTED" },
    { label: "Em andamento", value: s.counts.IN_PROGRESS, icon: Hourglass, href: "/admin/anamneses?situacao=IN_PROGRESS" },
    { label: "Atrasadas", value: s.counts.OVERDUE, icon: AlertTriangle, href: "/admin/anamneses?situacao=OVERDUE", warn: s.counts.OVERDUE > 0 },
    { label: "Próximos atendimentos", value: s.upcoming.length, icon: CalendarDays, href: "/admin/agenda" },
    { label: "Solicitações de correção", value: s.corrections, icon: Inbox, href: "/admin/solicitacoes", warn: s.corrections > 0 },
    { label: "Notificações não lidas", value: s.unread, icon: Bell, href: "/admin/notificacoes" },
  ];
  const order: DisplayStatus[] = ["NOT_STARTED", "IN_PROGRESS", "OVERDUE", "SUBMITTED", "REVIEWED"];
  const max = Math.max(1, ...order.map((k) => s.counts[k]));
  const barColor: Record<DisplayStatus, string> = {
    NOT_STARTED: "bg-bege-300", IN_PROGRESS: "bg-oliva-400", OVERDUE: "bg-terra-400", SUBMITTED: "bg-salvia-400", REVIEWED: "bg-salvia-600",
  };

  return (
    <>
      <PageHeader title={`Bom te ver, ${admin.name.split(" ")[0]}`} subtitle={<span className="inline-block first-letter:uppercase">{fmtLong(new Date())}</span>}
        actions={<><Link href="/admin/liberar" className="btn-primary btn-sm">Liberar anamnese</Link><Link href="/admin/agenda/novo" className="btn-secondary btn-sm">Novo compromisso</Link></>} />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {cards.map(({ label, value, icon: Icon, href, warn, extra }) => (
          <Link key={label} href={href} className="card group p-5 transition hover:-translate-y-0.5">
            <div className="flex items-center justify-between">
              <Icon className={`h-5 w-5 ${warn ? "text-terra-500" : "text-salvia-500"}`} aria-hidden />
              {extra && <span className="badge bg-terra-500 text-white">{extra}</span>}
            </div>
            <p className={`mt-3 font-serif text-4xl ${warn ? "text-terra-600" : "text-salvia-800"}`}>{value}</p>
            <p className="text-xs font-semibold text-salvia-600">{label}</p>
          </Link>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <section className="card p-6">
          <h2 className="text-2xl">Próximos atendimentos</h2>
          <div className="mt-4 space-y-3">
            {s.upcoming.length === 0 && <EmptyState>Nenhum compromisso futuro na agenda.</EmptyState>}
            {s.upcoming.map((a) => (
              <Link key={a.id} href={`/admin/agenda/${a.id}`} className="flex items-center justify-between gap-3 rounded-xl bg-bege-50 px-4 py-3 hover:bg-bege-100">
                <div>
                  <p className="font-semibold text-salvia-800">{a.title}</p>
                  <p className="text-xs text-salvia-600">{fmtDateTime(a.startsAt)} · {a.durationMin} min{a.patient ? ` · ${a.patient.fullName}` : ""}</p>
                </div>
                {a.anamnesis ? <StatusBadge status={displayStatus(a.anamnesis)} /> : a.patient ? <span className="badge bg-white text-salvia-500">Sem anamnese</span> : null}
              </Link>
            ))}
          </div>
        </section>

        <section className="card p-6">
          <h2 className="text-2xl">Anamneses por situação</h2>
          <div className="mt-5 space-y-3" role="list">
            {order.map((k) => (
              <div key={k} role="listitem" className="grid grid-cols-[7rem_1fr_2rem] items-center gap-3 text-sm">
                <span className="text-salvia-600">{STATUS_LABEL[k]}</span>
                <div className="h-3 overflow-hidden rounded-full bg-bege-100">
                  <div className={`h-full rounded-full ${barColor[k]}`} style={{ width: `${(s.counts[k] / max) * 100}%` }} />
                </div>
                <span className="text-right font-semibold text-salvia-800">{s.counts[k]}</span>
              </div>
            ))}
          </div>
          <h3 className="mt-8 text-xl">Envios recentes</h3>
          <ul className="mt-3 space-y-2">
            {s.recentSubmitted.length === 0 && <li className="text-sm text-salvia-500">Nenhuma anamnese enviada ainda.</li>}
            {s.recentSubmitted.map((a) => (
              <li key={a.id}>
                <Link href={`/admin/anamneses/${a.id}`} className="flex items-center justify-between gap-2 text-sm hover:underline">
                  <span>{a.patient.fullName} · nº {a.sequence}{!a.adminViewedAt && <span className="ml-2 badge bg-terra-500 text-white">nova</span>}</span>
                  <span className="text-xs text-salvia-500">{fmtDateTime(a.submittedAt)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
