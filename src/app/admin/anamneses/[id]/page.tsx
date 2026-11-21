import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Eye, FileText, History, Trash2 } from "lucide-react";
import { prisma } from "@/lib/db";
import { CORRECTION_STATUS_LABEL, REPORT_TYPE_LABEL } from "@/lib/constants";
import { answerToPlainText, parseStructured } from "@/lib/answers";
import { fmtDateTime } from "@/lib/dates";
import { displayStatus, isSubmitted } from "@/lib/status";
import {
  addNoteAction, correctAnswerAction, deleteNoteAction, generateReportAction, markReviewedAction,
  practitionerRequestAction, resolveCorrectionAction, setConsultationAction,
} from "@/app/actions/admin";
import { AnswersView } from "@/components/AnswersView";
import { ClarificationForm, ConsultationForm, CorrectAnswerForm, ReportButtons, ResolveForm } from "@/components/admin/AnamnesisForms";
import { NoteForm } from "@/components/admin/NoteForms";
import { StatusBadge, Pill } from "@/components/ui/StatusBadge";
import { PageHeader } from "@/components/ui/PageHeader";
import { requireAdminPage } from "@/server/session";
import { markViewedByAdmin } from "@/server/services/anamneses";
import { audit } from "@/server/services/audit";

export const metadata = { title: "Anamnese" };

export default async function AdminAnamnesisPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ liberada?: string }> }) {
  const admin = await requireAdminPage();
  const { id } = await params;
  const sp = await searchParams;
  const a = await prisma.anamnesis.findUnique({
    where: { id },
    include: {
      patient: { include: { user: { select: { email: true } } } },
      appointment: true,
      answers: {
        include: {
          revisions: { orderBy: { changedAt: "desc" }, include: { changedBy: { select: { name: true } } } },
        },
      },
      notes: { orderBy: { createdAt: "desc" } },
      correctionRequests: { orderBy: { createdAt: "desc" }, include: { question: { select: { number: true } } } },
      reports: { orderBy: { createdAt: "desc" }, select: { id: true, type: true, createdAt: true, sizeBytes: true } },
    },
  });
  if (!a) notFound();
  await markViewedByAdmin(a.id);
  await audit({ actorId: admin.id, action: "ANAMNESIS_VIEWED", entityType: "Anamnesis", entityId: a.id });

  const questions = await prisma.question.findMany({ where: { isActive: true }, orderBy: { number: "asc" } });
  const submitted = isSubmitted(a);
  const status = displayStatus(a);
  const openRequests = a.correctionRequests
    .filter((c) => c.status === "OPEN" || c.status === "ANSWERED")
    .map((c) => ({ id: c.id, label: `${c.origin === "PATIENT" ? "Pedido da paciente" : "Seu pedido"} de ${fmtDateTime(c.createdAt)}${c.question ? ` (perg. ${c.question.number})` : ""}` }));
  const path = `/admin/anamneses/${a.id}`;

  return (
    <>
      {sp.liberada && (
        <p role="status" className="mb-6 flex items-center gap-2 rounded-xl bg-salvia-50 px-4 py-3 text-sm text-salvia-700">
          <CheckCircle2 className="h-4 w-4" aria-hidden /> Anamnese liberada. A paciente foi notificada e o prazo foi calculado.
        </p>
      )}
      <PageHeader
        title={`Anamnese nº ${a.sequence}`}
        subtitle={<><Link href={`/admin/pacientes/${a.patient.id}`} className="link">{a.patient.fullName}</Link> · {a.patient.user.email}</>}
        actions={
          <>
            <Link href={`${path}/relatorio?tipo=completo`} className="btn-secondary btn-sm"><Eye className="h-4 w-4" aria-hidden /> Relatório completo</Link>
            <Link href={`${path}/relatorio?tipo=resumido`} className="btn-secondary btn-sm"><FileText className="h-4 w-4" aria-hidden /> Relatório resumido</Link>
            {a.status === "SUBMITTED" && (
              <form action={markReviewedAction.bind(null, a.id)}><button className="btn-primary btn-sm"><CheckCircle2 className="h-4 w-4" aria-hidden /> Marcar como revisada</button></form>
            )}
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_21rem]">
        <div className="min-w-0 space-y-6">
          {!submitted && (
            <div className="rounded-2xl border border-oliva-200 bg-oliva-50 p-5 text-sm text-oliva-800">
              Esta anamnese ainda não foi enviada. As respostas abaixo são um rascunho salvo automaticamente e podem mudar até o envio.
            </div>
          )}
          <section className="card p-5 sm:p-7">
            <h2 className="mb-5 text-2xl">Respostas por categoria</h2>
            <AnswersView
              questions={questions}
              answers={a.answers}
              renderExtra={(q, ans) => (
                <>
                  {ans && ans.revisions.length > 0 && (
                    <details className="mt-3 text-xs">
                      <summary className="cursor-pointer font-semibold text-salvia-600"><History className="mr-1 inline h-3.5 w-3.5" aria-hidden />Histórico de alterações ({ans.revisions.length})</summary>
                      <ol className="mt-2 space-y-2">
                        {ans.revisions.map((r) => (
                          <li key={r.id} className="rounded-lg bg-bege-50 p-3">
                            <p className="text-salvia-500">{fmtDateTime(r.changedAt)} · por {r.changedBy.name} · motivo: {r.reason}</p>
                            <p className="mt-1 whitespace-pre-wrap text-salvia-800"><strong>Antes:</strong> {answerToPlainText(q, { value: r.previousValue, skipReason: r.previousSkipReason }) || "(vazia)"}</p>
                            <p className="mt-1 whitespace-pre-wrap text-salvia-800"><strong>Depois:</strong> {answerToPlainText(q, { value: r.newValue, skipReason: r.newSkipReason }) || "(vazia)"}</p>
                          </li>
                        ))}
                      </ol>
                    </details>
                  )}
                  {submitted && (
                    <CorrectAnswerForm
                      action={correctAnswerAction.bind(null, a.id, q.id)}
                      q={q}
                      current={q.fieldType === "composite" || q.fieldType === "choice" ? parseStructured(ans?.value ?? "") : (ans?.value ?? "")}
                      skipReason={ans?.skipReason ?? null}
                      requests={openRequests}
                    />
                  )}
                </>
              )}
            />
          </section>

          <section id="correcoes" className="card scroll-mt-24 p-6">
            <h2 className="text-2xl">Correções e esclarecimentos</h2>
            <div className="mt-4 space-y-4">
              {a.correctionRequests.length === 0 && <p className="text-sm text-salvia-500">Nenhuma solicitação.</p>}
              {a.correctionRequests.map((c) => (
                <div key={c.id} className="rounded-xl bg-bege-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-salvia-800">
                      {c.origin === "PATIENT" ? "Pedido da paciente" : "Seu pedido de esclarecimento"}{c.question ? ` · pergunta ${c.question.number}` : ""}
                    </p>
                    <Pill tone={c.status === "OPEN" || c.status === "ANSWERED" ? "warn" : "ok"}>{CORRECTION_STATUS_LABEL[c.status]}</Pill>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-salvia-700">{c.message}</p>
                  <p className="text-xs text-salvia-400">{fmtDateTime(c.createdAt)}</p>
                  {c.patientReply && <p className="mt-2 rounded-lg bg-white p-3 text-sm"><strong>Resposta da paciente ({fmtDateTime(c.repliedAt)}):</strong> {c.patientReply}</p>}
                  {c.resolution && <p className="mt-2 text-sm text-salvia-600">Retorno: {c.resolution}</p>}
                  {(c.status === "OPEN" || c.status === "ANSWERED") && <ResolveForm action={resolveCorrectionAction.bind(null, c.id, a.id)} />}
                </div>
              ))}
              <div className="border-t border-bege-100 pt-4">
                <h3 className="mb-2 text-lg">Pedir esclarecimento à paciente</h3>
                <ClarificationForm action={practitionerRequestAction.bind(null, a.id)} questions={questions} />
              </div>
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="card p-6">
            <div className="flex items-center justify-between"><h2 className="text-xl">Situação</h2><StatusBadge status={status} /></div>
            <dl className="mt-4 space-y-2 text-sm">
              <div><dt className="text-salvia-500">Liberada em</dt><dd>{fmtDateTime(a.releasedAt)}{a.isFirst ? " (primeira anamnese)" : ""}</dd></div>
              <div><dt className="text-salvia-500">Consulta</dt><dd>{a.consultationAt ? fmtDateTime(a.consultationAt) : "Sem consulta vinculada"}</dd></div>
              <div><dt className="text-salvia-500">Prazo (48h antes)</dt><dd>{a.dueAt ? fmtDateTime(a.dueAt) : "Sem prazo"}</dd></div>
              <div><dt className="text-salvia-500">Início do preenchimento</dt><dd>{fmtDateTime(a.startedAt)}</dd></div>
              <div><dt className="text-salvia-500">Último salvamento</dt><dd>{fmtDateTime(a.lastSavedAt)}</dd></div>
              <div><dt className="text-salvia-500">Enviada em</dt><dd>{a.submittedAt ? fmtDateTime(a.submittedAt) : "—"}{a.submittedLate && <span className="ml-1 badge bg-bege-100 text-terra-600">fora do prazo</span>}</dd></div>
              {a.reviewedAt && <div><dt className="text-salvia-500">Revisada em</dt><dd>{fmtDateTime(a.reviewedAt)}</dd></div>}
              {a.appointment && <div><dt className="text-salvia-500">Compromisso</dt><dd><Link className="link" href={`/admin/agenda/${a.appointment.id}`}>{a.appointment.title}</Link></dd></div>}
            </dl>
            {!submitted && (
              <div className="mt-5 border-t border-bege-100 pt-4">
                <p className="mb-2 text-sm font-semibold text-salvia-800">{a.consultationAt ? "Remarcar consulta" : "Vincular consulta e calcular prazo"}</p>
                <ConsultationForm action={setConsultationAction.bind(null, a.id)} hasAppointment={!!a.appointmentId} />
              </div>
            )}
          </section>

          <section className="card p-6">
            <h2 className="text-xl">Relatórios em PDF</h2>
            <p className="mb-3 mt-1 text-xs text-salvia-500">Os PDFs ficam arquivados com acesso restrito e nunca incluem observações internas.</p>
            <ReportButtons full={generateReportAction.bind(null, a.id, "FULL")} summary={generateReportAction.bind(null, a.id, "SUMMARY")} />
            {a.reports.length > 0 && (
              <ul className="mt-4 space-y-1 text-sm">
                {a.reports.map((r) => (
                  <li key={r.id}>
                    <a className="link" href={`/api/admin/relatorios/${r.id}`}>{REPORT_TYPE_LABEL[r.type]} · {fmtDateTime(r.createdAt)}</a>
                    <span className="text-xs text-salvia-400"> ({Math.ceil(r.sizeBytes / 1024)} KB)</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card p-6">
            <h2 className="text-xl">Observações privadas</h2>
            <p className="mb-3 mt-1 text-xs text-salvia-500">Visíveis somente para você. Não alteram as respostas.</p>
            <NoteForm action={addNoteAction.bind(null, a.patientId, a.id)} />
            <ul className="mt-4 space-y-3">
              {a.notes.map((n) => (
                <li key={n.id} className="rounded-xl bg-bege-50 p-3">
                  <p className="whitespace-pre-wrap text-sm text-salvia-800">{n.content}</p>
                  <div className="mt-2 flex items-center justify-between text-xs text-salvia-500">
                    <span>{fmtDateTime(n.createdAt)}</span>
                    <form action={deleteNoteAction.bind(null, n.id, path)}>
                      <button className="inline-flex items-center gap-1 hover:text-terra-600" aria-label="Excluir observação"><Trash2 className="h-3.5 w-3.5" aria-hidden /> excluir</button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </>
  );
}
