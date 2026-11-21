import Link from "next/link";
import { CalendarClock, ClipboardList, Bell, UserRound } from "lucide-react";
import { prisma } from "@/lib/db";
import { fmtDate, fmtDateTime, hoursUntil } from "@/lib/dates";
import { isSubmitted, displayStatus, isOverdue } from "@/lib/status";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/PageHeader";
import { requirePatientPage } from "@/server/session";
import { listNotifications } from "@/server/services/notifications";

export const metadata = { title: "Minha área" };

export default async function PatientDashboard() {
  const u = await requirePatientPage();
  const [anamneses, notifications, totalQuestions] = await Promise.all([
    prisma.anamnesis.findMany({
      where: { patientId: u.patientId },
      orderBy: { sequence: "desc" },
      include: { _count: { select: { answers: true } } },
    }),
    listNotifications(u.id, { take: 5 }),
    prisma.question.count({ where: { isActive: true } }),
  ]);
  const open = anamneses.filter((a) => !isSubmitted(a)).sort((a, b) => a.sequence - b.sequence);
  const sent = anamneses.filter((a) => isSubmitted(a));
  const newest = open.find((a) => a.status === "NOT_STARTED");

  return (
    <div className="space-y-8">
      <section>
        <p className="text-sm uppercase tracking-[0.2em] text-oliva-600">Minha área</p>
        <h1 className="mt-1 text-4xl sm:text-5xl">Olá, {u.preferredName} 🌿</h1>
        <p className="mt-2 text-salvia-600">Que bom te ver por aqui. Este é o seu espaço de cuidado.</p>
      </section>

      {newest && (
        <div role="status" className="flex flex-col gap-3 rounded-2xl border border-oliva-200 bg-oliva-50 p-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-oliva-800">
            <strong>Nova anamnese disponível.</strong>{" "}
            {newest.dueAt ? `Envie até ${fmtDateTime(newest.dueAt)}.` : "Responda quando puder, com calma."}
          </p>
          <Link href={`/paciente/anamneses/${newest.id}`} className="btn-primary btn-sm">Responder</Link>
        </div>
      )}

      <section aria-labelledby="atual">
        <h2 id="atual" className="mb-4 flex items-center gap-2 text-2xl"><ClipboardList className="h-5 w-5 text-salvia-500" aria-hidden /> Anamnese atual</h2>
        {open.length === 0 ? (
          <EmptyState>
            Você não tem nenhuma anamnese pendente. Quando a profissional liberar uma nova anamnese, ela aparecerá aqui.
          </EmptyState>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {open.map((a) => {
              const overdue = isOverdue(a);
              const h = a.dueAt ? hoursUntil(a.dueAt) : null;
              const pct = Math.round((Math.min(a._count.answers, totalQuestions) / totalQuestions) * 100);
              return (
                <div key={a.id} className="card p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm text-salvia-500">Anamnese nº {a.sequence}{a.isFirst ? " · primeira" : ""}</p>
                      {a.consultationAt && <p className="mt-1 text-salvia-700">Consulta: <strong>{fmtDateTime(a.consultationAt)}</strong></p>}
                    </div>
                    <StatusBadge status={displayStatus(a)} />
                  </div>
                  <div className="mt-4 flex items-center gap-2 text-sm">
                    <CalendarClock className="h-4 w-4 text-salvia-500" aria-hidden />
                    {a.dueAt ? (
                      <span className={overdue ? "text-terra-700" : "text-salvia-700"}>
                        Prazo de envio: <strong>{fmtDateTime(a.dueAt)}</strong>
                        {overdue ? " — o prazo passou, mas você ainda pode enviar." : h !== null && h < 24 ? " — faltam menos de 24 horas." : ""}
                      </span>
                    ) : (
                      <span className="text-salvia-600">Sem prazo definido ainda.</span>
                    )}
                  </div>
                  <div className="mt-4">
                    <div className="h-2 overflow-hidden rounded-full bg-bege-100" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Progresso">
                      <div className="h-full rounded-full bg-salvia-500" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="mt-1 text-xs text-salvia-500">
                      {a.lastSavedAt ? `Salva automaticamente em ${fmtDateTime(a.lastSavedAt)}` : "Ainda não iniciada"}
                    </p>
                  </div>
                  <Link href={`/paciente/anamneses/${a.id}`} className="btn-primary mt-5 w-full">
                    {a.status === "NOT_STARTED" ? "Começar a anamnese" : "Continuar de onde parei"}
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <section aria-labelledby="historico">
          <h2 id="historico" className="mb-4 text-2xl">Histórico de anamneses enviadas</h2>
          {sent.length === 0 ? (
            <EmptyState>Suas anamneses enviadas aparecerão aqui.</EmptyState>
          ) : (
            <div className="card divide-y divide-bege-100">
              {sent.map((a) => (
                <Link key={a.id} href={`/paciente/anamneses/${a.id}`} className="flex flex-col gap-1 px-5 py-4 hover:bg-bege-50 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-salvia-800">Anamnese nº {a.sequence}</p>
                    <p className="text-xs text-salvia-500">
                      Preenchimento iniciado em {fmtDate(a.startedAt)} · Enviada em {fmtDateTime(a.submittedAt)}
                      {a.consultationAt ? ` · Consulta de ${fmtDate(a.consultationAt)}` : ""}
                    </p>
                  </div>
                  <span className="flex items-center gap-2">
                    {a.submittedLate && <span className="badge bg-bege-100 text-terra-600">Enviada após o prazo</span>}
                    <span className="badge bg-salvia-100 text-salvia-700">Enviada</span>
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section aria-labelledby="avisos" className="space-y-6">
          <div>
            <h2 id="avisos" className="mb-4 flex items-center gap-2 text-2xl"><Bell className="h-5 w-5 text-salvia-500" aria-hidden /> Notificações</h2>
            <div className="card divide-y divide-bege-100">
              {notifications.length === 0 && <p className="px-5 py-6 text-sm text-salvia-500">Sem notificações.</p>}
              {notifications.map((n) => (
                <div key={n.id} className={`px-5 py-3 ${n.readAt ? "" : "bg-bege-50/70"}`}>
                  <p className="text-sm font-semibold text-salvia-800">{n.title}</p>
                  <p className="text-xs text-salvia-600">{n.body}</p>
                </div>
              ))}
              <Link href="/paciente/notificacoes" className="block px-5 py-3 text-center text-sm font-semibold text-salvia-700 hover:bg-bege-50">Ver todas</Link>
            </div>
          </div>
          <Link href="/paciente/conta" className="card flex items-center gap-3 p-5 hover:bg-bege-50">
            <UserRound className="h-5 w-5 text-salvia-500" aria-hidden />
            <span>
              <span className="block font-semibold text-salvia-800">Dados da conta</span>
              <span className="block text-xs text-salvia-500">Nome, e-mail, senha e privacidade</span>
            </span>
          </Link>
        </section>
      </div>
    </div>
  );
}
