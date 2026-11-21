import { prisma } from "@/lib/db";
import { APPOINTMENT_STATUS } from "@/lib/constants";
import { AppError, NotFoundError } from "@/lib/errors";
import { computeDueAt, fmtDateTime, parseLocalDateTime } from "@/lib/dates";
import { isSubmitted } from "@/lib/status";
import { audit } from "./audit";
import { notifyUser } from "./notifications";

export type AppointmentInput = {
  title: string;
  description?: string | null;
  date: string;
  time: string;
  durationMin: number;
  patientId?: string | null;
  privateNotes?: string | null;
};

function toData(input: AppointmentInput) {
  let startsAt: Date;
  try {
    startsAt = parseLocalDateTime(input.date, input.time);
  } catch {
    throw new AppError("Data ou horário inválido.");
  }
  return {
    title: input.title.trim(),
    description: input.description?.trim() || null,
    startsAt,
    durationMin: input.durationMin,
    patientId: input.patientId || null,
    privateNotes: input.privateNotes?.trim() || null,
  };
}

async function assertPatient(patientId: string | null) {
  if (!patientId) return;
  const p = await prisma.patient.findUnique({ where: { id: patientId }, select: { id: true } });
  if (!p) throw new AppError("Paciente não encontrada.");
}

export async function createAppointment(adminId: string, input: AppointmentInput) {
  const data = toData(input);
  await assertPatient(data.patientId);
  const appt = await prisma.appointment.create({ data });
  await audit({ actorId: adminId, action: "APPOINTMENT_CREATED", entityType: "Appointment", entityId: appt.id });
  return appt;
}

/** Edita um compromisso. Se houver anamnese vinculada ainda não enviada, o prazo é recalculado. */
export async function updateAppointment(adminId: string, id: string, input: AppointmentInput) {
  const current = await prisma.appointment.findUnique({ where: { id }, include: { anamnesis: { include: { patient: true } } } });
  if (!current) throw new NotFoundError("Compromisso não encontrado.");
  const data = toData(input);
  await assertPatient(data.patientId);
  if (current.anamnesis && data.patientId !== current.anamnesis.patientId) {
    throw new AppError("Este compromisso tem uma anamnese vinculada; não é possível trocar a paciente.");
  }
  await prisma.$transaction(async (tx) => {
    await tx.appointment.update({ where: { id }, data });
    const a = current.anamnesis;
    if (a && !isSubmitted(a) && current.startsAt.getTime() !== data.startsAt.getTime()) {
      const dueAt = computeDueAt(data.startsAt);
      await tx.anamnesis.update({
        where: { id: a.id },
        data: { consultationAt: data.startsAt, dueAt, nearDueNotifiedAt: null, overdueNotifiedAt: null },
      });
      await notifyUser(
        a.patient.userId,
        {
          type: "DEADLINE",
          title: "Prazo da anamnese atualizado",
          body: `Sua consulta foi remarcada para ${fmtDateTime(data.startsAt)}. Novo prazo de envio: ${fmtDateTime(dueAt)}.`,
          link: `/paciente/anamneses/${a.id}`,
        },
        tx,
      );
    }
    await audit({ actorId: adminId, action: "APPOINTMENT_UPDATED", entityType: "Appointment", entityId: id }, tx);
  });
}

export async function setAppointmentStatus(adminId: string, id: string, status: "COMPLETED" | "CANCELED" | "SCHEDULED") {
  const appt = await prisma.appointment.findUnique({ where: { id } });
  if (!appt) throw new NotFoundError("Compromisso não encontrado.");
  await prisma.appointment.update({
    where: { id },
    data: {
      status,
      completedAt: status === APPOINTMENT_STATUS.COMPLETED ? new Date() : null,
      canceledAt: status === APPOINTMENT_STATUS.CANCELED ? new Date() : null,
    },
  });
  await audit({ actorId: adminId, action: `APPOINTMENT_${status}`, entityType: "Appointment", entityId: id });
}

export function listAppointments(start: Date, end: Date) {
  return prisma.appointment.findMany({
    where: { startsAt: { gte: start, lt: end } },
    include: { patient: { select: { id: true, fullName: true, preferredName: true } }, anamnesis: { select: { id: true } } },
    orderBy: { startsAt: "asc" },
  });
}
