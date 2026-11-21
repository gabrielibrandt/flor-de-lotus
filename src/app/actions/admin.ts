"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AppError } from "@/lib/errors";
import { appointmentSchema, firstError, releaseSchema } from "@/lib/validation";
import { parseConfig } from "@/lib/answers";
import type { CompositeConfig } from "@/lib/questions";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/server/session";
import { correctAnswer, markReviewed, releaseAnamnesis, setConsultation } from "@/server/services/anamneses";
import { practitionerRequestCorrection, resolveCorrection } from "@/server/services/corrections";
import { addNote, deleteNote, updateNote } from "@/server/services/notes";
import { createAppointment, setAppointmentStatus, updateAppointment } from "@/server/services/appointments";
import { createPasswordResetToken } from "@/server/services/accounts";
import { deletePatientData, resolveDataRequest } from "@/server/services/privacy";
import { generateAndStoreReport } from "@/server/services/reports";
import type { ActionState } from "@/components/ui/forms";

function handle(e: unknown): ActionState {
  if (e instanceof AppError) return { error: e.message };
  console.error(e);
  return { error: "Não foi possível concluir a operação. Tente novamente." };
}

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "");

// ------------------------------------------------------------ Anamneses

export async function releaseAnamnesisAction(_: ActionState, fd: FormData): Promise<ActionState> {
  let id: string;
  try {
    const admin = await requireAdmin();
    const parsed = releaseSchema.safeParse({
      patientId: str(fd, "patientId"), date: str(fd, "date"), time: str(fd, "time"),
      appointmentId: str(fd, "appointmentId") || null, addToAgenda: fd.get("addToAgenda") === "on",
    });
    if (!parsed.success) return { error: firstError(parsed.error) };
    id = (await releaseAnamnesis(admin.id, parsed.data)).id;
  } catch (e) {
    return handle(e);
  }
  revalidatePath("/admin", "layout");
  redirect(`/admin/anamneses/${id}?liberada=1`);
}

export async function setConsultationAction(anamnesisId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const admin = await requireAdmin();
    await setConsultation(admin.id, anamnesisId, str(fd, "date"), str(fd, "time"), fd.get("addToAgenda") === "on");
  } catch (e) {
    return handle(e);
  }
  revalidatePath(`/admin/anamneses/${anamnesisId}`);
  return { ok: true, message: "Consulta vinculada e prazo calculado. A paciente foi notificada." };
}

export async function markReviewedAction(anamnesisId: string) {
  const admin = await requireAdmin();
  await markReviewed(admin.id, anamnesisId);
  revalidatePath(`/admin/anamneses/${anamnesisId}`);
}

function readAnswerValue(q: { fieldType: string; config: string | null }, fd: FormData): unknown {
  if (q.fieldType === "composite") {
    const cfg = parseConfig<CompositeConfig>(q);
    return Object.fromEntries((cfg?.fields ?? []).map((f) => [f.key, str(fd, `f_${f.key}`)]));
  }
  if (q.fieldType === "choice") return { option: str(fd, "option"), details: str(fd, "details") };
  return str(fd, "value");
}

export async function correctAnswerAction(anamnesisId: string, questionId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const admin = await requireAdmin();
    const q = await prisma.question.findUnique({ where: { id: questionId } });
    if (!q) return { error: "Pergunta não encontrada." };
    await correctAnswer(admin.id, {
      anamnesisId, questionId, value: readAnswerValue(q, fd), skipReason: str(fd, "skipReason") || null,
      reason: str(fd, "reason"), correctionRequestId: str(fd, "correctionRequestId") || null,
    });
  } catch (e) {
    return handle(e);
  }
  revalidatePath(`/admin/anamneses/${anamnesisId}`);
  return { ok: true, message: "Resposta corrigida. A versão anterior foi preservada no histórico." };
}

export async function practitionerRequestAction(anamnesisId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const admin = await requireAdmin();
    await practitionerRequestCorrection(admin.id, anamnesisId, str(fd, "questionId") || null, str(fd, "message"));
  } catch (e) {
    return handle(e);
  }
  revalidatePath(`/admin/anamneses/${anamnesisId}`);
  return { ok: true, message: "Pedido enviado à paciente." };
}

export async function resolveCorrectionAction(requestId: string, anamnesisId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const admin = await requireAdmin();
    const outcome = str(fd, "outcome") === "REJECTED" ? "REJECTED" : "RESOLVED";
    await resolveCorrection(admin.id, requestId, outcome, str(fd, "resolution"));
  } catch (e) {
    return handle(e);
  }
  revalidatePath(`/admin/anamneses/${anamnesisId}`);
  revalidatePath("/admin/solicitacoes");
  return { ok: true, message: "Solicitação finalizada e paciente notificada." };
}

// ------------------------------------------------------------ Observações

export async function addNoteAction(patientId: string, anamnesisId: string | null, _: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const admin = await requireAdmin();
    await addNote(admin.id, { patientId, anamnesisId, content: str(fd, "content") });
  } catch (e) {
    return handle(e);
  }
  revalidatePath(anamnesisId ? `/admin/anamneses/${anamnesisId}` : `/admin/pacientes/${patientId}`);
  return { ok: true, message: "Observação salva." };
}

export async function updateNoteAction(noteId: string, path: string, _: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const admin = await requireAdmin();
    await updateNote(admin.id, noteId, str(fd, "content"));
  } catch (e) {
    return handle(e);
  }
  revalidatePath(path);
  return { ok: true, message: "Observação atualizada." };
}

export async function deleteNoteAction(noteId: string, path: string) {
  const admin = await requireAdmin();
  await deleteNote(admin.id, noteId);
  revalidatePath(path);
}

// ------------------------------------------------------------ Agenda

function parseAppointment(fd: FormData) {
  return appointmentSchema.safeParse({
    title: str(fd, "title"), description: str(fd, "description"), date: str(fd, "date"), time: str(fd, "time"),
    durationMin: str(fd, "durationMin") || "60", patientId: str(fd, "patientId") || null, privateNotes: str(fd, "privateNotes"),
  });
}

export async function createAppointmentAction(_: ActionState, fd: FormData): Promise<ActionState> {
  let date: string;
  try {
    const admin = await requireAdmin();
    const parsed = parseAppointment(fd);
    if (!parsed.success) return { error: firstError(parsed.error) };
    await createAppointment(admin.id, parsed.data);
    date = parsed.data.date;
  } catch (e) {
    return handle(e);
  }
  revalidatePath("/admin", "layout");
  redirect(`/admin/agenda?data=${date}&vista=dia`);
}

export async function updateAppointmentAction(id: string, _: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const admin = await requireAdmin();
    const parsed = parseAppointment(fd);
    if (!parsed.success) return { error: firstError(parsed.error) };
    await updateAppointment(admin.id, id, parsed.data);
  } catch (e) {
    return handle(e);
  }
  revalidatePath("/admin", "layout");
  return { ok: true, message: "Compromisso atualizado." };
}

export async function appointmentStatusAction(id: string, status: "COMPLETED" | "CANCELED" | "SCHEDULED") {
  const admin = await requireAdmin();
  await setAppointmentStatus(admin.id, id, status);
  revalidatePath("/admin", "layout");
}

// ------------------------------------------------------------ Pacientes / LGPD

export async function createResetLinkAction(patientId: string, _: ActionState): Promise<ActionState> {
  try {
    const admin = await requireAdmin();
    const token = await createPasswordResetToken(admin.id, patientId);
    const base = (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
    return { ok: true, message: "Link gerado. Copie e envie à paciente pelo canal de contato habitual. Ele vale por 24 horas e só pode ser usado uma vez.", data: { link: `${base}/redefinir-senha/${token}` } };
  } catch (e) {
    return handle(e);
  }
}

export async function resolveDataRequestAction(id: string, _: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const admin = await requireAdmin();
    await resolveDataRequest(admin.id, id, str(fd, "status") === "REJECTED" ? "REJECTED" : "DONE", str(fd, "response"));
  } catch (e) {
    return handle(e);
  }
  revalidatePath("/admin/solicitacoes");
  return { ok: true, message: "Solicitação atualizada." };
}

export async function deletePatientAction(patientId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const admin = await requireAdmin();
    await deletePatientData(admin.id, patientId, str(fd, "confirmEmail"));
  } catch (e) {
    return handle(e);
  }
  revalidatePath("/admin", "layout");
  redirect("/admin/pacientes?excluida=1");
}

// ------------------------------------------------------------ Relatórios

export async function generateReportAction(anamnesisId: string, type: "FULL" | "SUMMARY", _: ActionState): Promise<ActionState> {
  try {
    const admin = await requireAdmin();
    const r = await generateAndStoreReport(admin.id, anamnesisId, type);
    revalidatePath(`/admin/anamneses/${anamnesisId}`);
    revalidatePath("/admin/relatorios");
    return { ok: true, message: "PDF gerado e arquivado.", data: { reportId: r.id } };
  } catch (e) {
    return handle(e);
  }
}
