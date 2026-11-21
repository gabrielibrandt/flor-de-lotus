import Link from "next/link";
import { notFound } from "next/navigation";
import { Trash2 } from "lucide-react";
import { prisma } from "@/lib/db";
import { APPOINTMENT_STATUS_LABEL } from "@/lib/constants";
import { fmtDate, fmtDateTime } from "@/lib/dates";
import { displayStatus } from "@/lib/status";
import { addNoteAction, createResetLinkAction, deleteNoteAction, deletePatientAction } from "@/app/actions/admin";
import { NoteForm } from "@/components/admin/NoteForms";
import { ResetLinkButton } from "@/components/admin/ResetLink";
import { DeletePatientForm } from "@/components/admin/DangerZone";
import { StatusBadge, Pill } from "@/components/ui/StatusBadge";
import { EmptyState, PageHeader } from "@/components/ui/PageHeader";
import { requireAdminPage } from "@/server/session";

export const metadata = { title: "Ficha da paciente" };

export default async function PatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage();
  const { id } = await params;
  const p = await prisma.patient.findUnique({
    where: { id },
    include: {
      user: { select: { email: true, lastLoginAt: true } },
      anamneses: { orderBy: { sequence: "desc" } },
      appointments: { orderBy: { startsAt: "desc" }, include: { anamnesis: { select: { id: true, sequence: true } } } },
      practitionerNotes: { where: { anamnesisId: null }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!p) notFound();
  const path = `/admin/pacientes/${p.id}`;

  return (
    <>
      <PageHeader
        title={p.fullName}
        subtitle={`Prefere ser chamada de ${p.preferredName}`}
        actions={<Link href={`/admin/liberar?paciente=${p.id}`} className="btn-primary btn-sm">Liberar nova anamnese</Link>}
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          <section className="card p-6">
            <h2 className="text-2xl">Histórico de anamneses</h2>
            <div className="mt-4 overflow-x-auto">
              {p.anamneses.length === 0 ? <EmptyState>Nenhuma anamnese.</EmptyState> : (
                <table className="table-base min-w-[600px]">
                  <thead><tr><th>Nº</th><th>Situação</th><th>Consulta</th><th>Prazo</th><th>Enviada</th><th></th></tr></thead>
                  <tbody>
                    {p.anamneses.map((a) => (
                      <tr key={a.id}>
                        <td className="font-semibold">{a.sequence}{a.isFirst ? " (1ª)" : ""}</td>
                        <td><StatusBadge status={displayStatus(a)} /></td>
                        <td>{a.consultationAt ? fmtDateTime(a.consultationAt) : "—"}</td>
                        <td>{a.dueAt ? fmtDateTime(a.dueAt) : "Sem prazo"}</td>
                        <td>{a.submittedAt ? <>{fmtDateTime(a.submittedAt)}{a.submittedLate && <span className="ml-1 badge bg-bege-100 text-terra-600">fora do prazo</span>}</> : "—"}</td>
                        <td><Link href={`/admin/anamneses/${a.id}`} className="btn-ghost btn-sm">Abrir</Link></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>

          <section className="card p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl">Atendimentos</h2>
              <Link href={`/admin/agenda/novo?paciente=${p.id}`} className="btn-secondary btn-sm">Novo compromisso</Link>
            </div>
            <ul className="mt-4 space-y-2">
              {p.appointments.length === 0 && <li><EmptyState>Nenhum compromisso vinculado.</EmptyState></li>}
              {p.appointments.map((a) => (
                <li key={a.id}>
                  <Link href={`/admin/agenda/${a.id}`} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-bege-50 px-4 py-3 hover:bg-bege-100">
                    <span><span className="font-semibold text-salvia-800">{a.title}</span> <span className="text-sm text-salvia-600">· {fmtDateTime(a.startsAt)} · {a.durationMin} min</span></span>
                    <span className="flex gap-2">
                      {a.anamnesis && <Pill tone="info">Anamnese nº {a.anamnesis.sequence}</Pill>}
                      <Pill tone={a.status === "CANCELED" ? "warn" : a.status === "COMPLETED" ? "ok" : "neutral"}>{APPOINTMENT_STATUS_LABEL[a.status]}</Pill>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section className="card p-6">
            <h2 className="text-2xl">Observações internas da paciente</h2>
            <p className="mb-4 text-sm text-salvia-500">Exclusivamente privadas — nunca aparecem para a paciente nem nos relatórios.</p>
            <NoteForm action={addNoteAction.bind(null, p.id, null)} />
            <ul className="mt-4 space-y-3">
              {p.practitionerNotes.map((n) => (
                <li key={n.id} className="rounded-xl bg-bege-50 p-4">
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
        </div>

        <aside className="space-y-6">
          <section className="card p-6">
            <h2 className="text-xl">Dados cadastrais</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div><dt className="text-salvia-500">E-mail</dt><dd className="break-all font-semibold text-salvia-800">{p.user.email}</dd></div>
              <div><dt className="text-salvia-500">Cadastro</dt><dd>{fmtDateTime(p.createdAt)}</dd></div>
              <div><dt className="text-salvia-500">Último acesso</dt><dd>{fmtDateTime(p.user.lastLoginAt)}</dd></div>
              <div><dt className="text-salvia-500">Consentimento LGPD</dt><dd>{fmtDate(p.consentAt)} (v. {p.privacyVersion})</dd></div>
            </dl>
          </section>
          <section className="card p-6">
            <h2 className="mb-3 text-xl">Acesso</h2>
            <ResetLinkButton action={createResetLinkAction.bind(null, p.id)} requested={!!p.passwordResetRequestedAt} />
          </section>
          <DeletePatientForm action={deletePatientAction.bind(null, p.id)} email={p.user.email} />
        </aside>
      </div>
    </>
  );
}
