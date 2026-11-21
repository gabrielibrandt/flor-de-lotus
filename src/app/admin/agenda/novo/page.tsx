import { prisma } from "@/lib/db";
import { createAppointmentAction } from "@/app/actions/admin";
import { AppointmentForm } from "@/components/admin/AppointmentForm";
import { PageHeader } from "@/components/ui/PageHeader";
import { requireAdminPage } from "@/server/session";

export const metadata = { title: "Novo compromisso" };

export default async function NewAppointmentPage({ searchParams }: { searchParams: Promise<{ data?: string; paciente?: string }> }) {
  await requireAdminPage();
  const sp = await searchParams;
  const patients = await prisma.patient.findMany({ orderBy: { fullName: "asc" }, select: { id: true, fullName: true, preferredName: true } });
  return (
    <>
      <PageHeader title="Novo compromisso" subtitle="Qualquer data e horário — a agenda não tem horários fixos." />
      <div className="card max-w-2xl p-6 sm:p-8">
        <AppointmentForm action={createAppointmentAction} patients={patients} defaults={{ date: sp.data, patientId: sp.paciente }} submitLabel="Salvar compromisso" />
      </div>
    </>
  );
}
