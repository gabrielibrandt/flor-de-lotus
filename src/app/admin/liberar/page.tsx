import { prisma } from "@/lib/db";
import { fmtDateTime, toLocalDateInput, toLocalTimeInput } from "@/lib/dates";
import { releaseAnamnesisAction } from "@/app/actions/admin";
import { ReleaseForm } from "@/components/admin/ReleaseForm";
import { PageHeader } from "@/components/ui/PageHeader";
import { requireAdminPage } from "@/server/session";

export const metadata = { title: "Liberar anamnese" };

export default async function ReleasePage({ searchParams }: { searchParams: Promise<{ paciente?: string; compromisso?: string }> }) {
  await requireAdminPage();
  const sp = await searchParams;
  const patients = await prisma.patient.findMany({
    orderBy: { fullName: "asc" },
    select: { id: true, fullName: true, _count: { select: { anamneses: { where: { status: { in: ["NOT_STARTED", "IN_PROGRESS"] } } } } } },
  });
  let defaults: { patientId?: string; date?: string; time?: string; appointmentId?: string; appointmentLabel?: string } = { patientId: sp.paciente };
  let warning: string | null = null;
  if (sp.compromisso) {
    const appt = await prisma.appointment.findUnique({ where: { id: sp.compromisso }, include: { anamnesis: true } });
    if (appt?.patientId && !appt.anamnesis) {
      defaults = {
        patientId: appt.patientId, date: toLocalDateInput(appt.startsAt), time: toLocalTimeInput(appt.startsAt),
        appointmentId: appt.id, appointmentLabel: `${appt.title} — ${fmtDateTime(appt.startsAt)}`,
      };
    } else if (appt?.anamnesis) {
      warning = "Este compromisso já possui uma anamnese vinculada.";
    }
  }
  return (
    <>
      <PageHeader title="Liberar nova anamnese" subtitle="A paciente recebe uma notificação e o prazo é calculado automaticamente: exatamente 48 horas antes da consulta." />
      {warning && <p className="mb-4 rounded-xl bg-bege-100 px-4 py-3 text-sm text-terra-700">{warning}</p>}
      <div className="card max-w-2xl p-6 sm:p-8">
        <ReleaseForm action={releaseAnamnesisAction} patients={patients.map((p) => ({ id: p.id, fullName: p.fullName, openCount: p._count.anamneses }))} defaults={defaults} />
      </div>
    </>
  );
}
