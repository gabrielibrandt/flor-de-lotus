import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { APPOINTMENT_STATUS_LABEL } from "@/lib/constants";
import { fmtDateTime, toLocalDateInput, toLocalTimeInput } from "@/lib/dates";
import { displayStatus } from "@/lib/status";
import { appointmentStatusAction, updateAppointmentAction } from "@/app/actions/admin";
import { AppointmentForm } from "@/components/admin/AppointmentForm";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pill, StatusBadge } from "@/components/ui/StatusBadge";
import { requireAdminPage } from "@/server/session";

export const metadata = { title: "Compromisso" };

export default async function AppointmentPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage();
  const { id } = await params;
  const a = await prisma.appointment.findUnique({ where: { id }, include: { patient: true, anamnesis: true } });
  if (!a) notFound();
  const patients = await prisma.patient.findMany({ orderBy: { fullName: "asc" }, select: { id: true, fullName: true, preferredName: true } });
  return (
    <>
      <PageHeader
        title={a.title}
        subtitle={<>{fmtDateTime(a.startsAt)} · {a.durationMin} min · <Pill tone={a.status === "CANCELED" ? "warn" : a.status === "COMPLETED" ? "ok" : "neutral"}>{APPOINTMENT_STATUS_LABEL[a.status]}</Pill></>}
        actions={<Link href={`/admin/agenda?vista=dia&data=${toLocalDateInput(a.startsAt)}`} className="btn-ghost btn-sm">← Agenda</Link>}
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="card p-6 sm:p-8">
          <h2 className="mb-4 text-2xl">Editar</h2>
          <AppointmentForm
            action={updateAppointmentAction.bind(null, a.id)}
            patients={patients}
            lockPatient={!!a.anamnesis}
            defaults={{
              title: a.title, description: a.description ?? "", date: toLocalDateInput(a.startsAt), time: toLocalTimeInput(a.startsAt),
              durationMin: a.durationMin, patientId: a.patientId ?? "", privateNotes: a.privateNotes ?? "",
            }}
            submitLabel="Salvar alterações"
          />
          {a.anamnesis && <p className="hint mt-3">Como há uma anamnese vinculada ainda não enviada, remarcar o horário recalcula o prazo e avisa a paciente.</p>}
        </div>
        <aside className="space-y-6">
          <section className="card space-y-3 p-6">
            <h2 className="text-xl">Situação</h2>
            {a.status !== "COMPLETED" && (
              <form action={appointmentStatusAction.bind(null, a.id, "COMPLETED")}><button className="btn-primary btn-sm w-full">Marcar como realizado</button></form>
            )}
            {a.status !== "CANCELED" && (
              <form action={appointmentStatusAction.bind(null, a.id, "CANCELED")}><button className="btn-secondary btn-sm w-full">Cancelar compromisso</button></form>
            )}
            {a.status !== "SCHEDULED" && (
              <form action={appointmentStatusAction.bind(null, a.id, "SCHEDULED")}><button className="btn-ghost btn-sm w-full">Voltar para agendado</button></form>
            )}
          </section>
          {a.patient && (
            <section className="card p-6">
              <h2 className="text-xl">Paciente</h2>
              <Link href={`/admin/pacientes/${a.patient.id}`} className="link mt-2 block">{a.patient.fullName}</Link>
              {a.anamnesis ? (
                <div className="mt-4 flex items-center justify-between">
                  <Link href={`/admin/anamneses/${a.anamnesis.id}`} className="link text-sm">Anamnese nº {a.anamnesis.sequence}</Link>
                  <StatusBadge status={displayStatus(a.anamnesis)} />
                </div>
              ) : (
                <Link href={`/admin/liberar?compromisso=${a.id}`} className="btn-primary btn-sm mt-4 w-full">Liberar anamnese com estes dados</Link>
              )}
            </section>
          )}
        </aside>
      </div>
    </>
  );
}
