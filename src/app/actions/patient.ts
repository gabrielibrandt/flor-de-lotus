"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AppError } from "@/lib/errors";
import { fieldErrors, profileSchema } from "@/lib/validation";
import { requirePatient } from "@/server/session";
import { saveAnswers, submitAnamnesis, AnswerInput } from "@/server/services/anamneses";
import { changePassword, updatePatientProfile } from "@/server/services/accounts";
import { patientReplyCorrection, patientRequestCorrection } from "@/server/services/corrections";
import { createDataRequest } from "@/server/services/privacy";
import type { ActionState } from "@/components/ui/forms";

function handle(e: unknown): ActionState {
  if (e instanceof AppError) return { error: e.message };
  console.error(e);
  return { error: "Não foi possível concluir agora. Tente novamente em instantes." };
}

/** Salvamento automático chamado pelo questionário. */
export async function saveAnswersAction(anamnesisId: string, items: AnswerInput[]): Promise<{ ok: boolean; savedAt?: string; error?: string; locked?: boolean }> {
  try {
    const u = await requirePatient();
    const r = await saveAnswers(u.patientId, String(anamnesisId), Array.isArray(items) ? items : []);
    return { ok: true, savedAt: r.savedAt.toISOString() };
  } catch (e) {
    const s = handle(e);
    return { ok: false, error: s.error, locked: e instanceof AppError && e.code === "LOCKED" };
  }
}

export async function submitAnamnesisAction(anamnesisId: string, _: ActionState): Promise<ActionState> {
  let late = false;
  try {
    const u = await requirePatient();
    late = (await submitAnamnesis(u.patientId, anamnesisId)).late;
  } catch (e) {
    return handle(e);
  }
  revalidatePath("/paciente", "layout");
  redirect(`/paciente/anamneses/${anamnesisId}?enviada=1${late ? "&atraso=1" : ""}`);
}

export async function requestCorrectionAction(anamnesisId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const u = await requirePatient();
    const q = String(fd.get("questionId") ?? "");
    await patientRequestCorrection(u.patientId, anamnesisId, q || null, String(fd.get("message") ?? ""));
  } catch (e) {
    return handle(e);
  }
  revalidatePath(`/paciente/anamneses/${anamnesisId}`);
  return { ok: true, message: "Solicitação enviada à profissional. Você será avisada aqui na plataforma." };
}

export async function replyCorrectionAction(requestId: string, anamnesisId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const u = await requirePatient();
    await patientReplyCorrection(u.patientId, requestId, String(fd.get("reply") ?? ""));
  } catch (e) {
    return handle(e);
  }
  revalidatePath(`/paciente/anamneses/${anamnesisId}`);
  return { ok: true, message: "Resposta enviada." };
}

export async function updateProfileAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = profileSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: "Revise os campos.", fieldErrors: fieldErrors(parsed.error) };
  try {
    const u = await requirePatient();
    await updatePatientProfile(u.id, parsed.data);
  } catch (e) {
    return handle(e);
  }
  revalidatePath("/paciente", "layout");
  return { ok: true, message: "Dados atualizados." };
}

export async function changePasswordAction(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const u = await requirePatient();
    await changePassword(u.id, String(fd.get("current") ?? ""), String(fd.get("password") ?? ""), String(fd.get("confirmPassword") ?? ""));
  } catch (e) {
    return handle(e);
  }
  return { ok: true, message: "Senha alterada com sucesso." };
}

export async function dataRequestAction(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const u = await requirePatient();
    await createDataRequest(u.patientId, String(fd.get("type") ?? ""), String(fd.get("details") ?? ""));
  } catch (e) {
    return handle(e);
  }
  revalidatePath("/paciente/conta");
  return { ok: true, message: "Solicitação registrada. A profissional responderá por aqui." };
}
