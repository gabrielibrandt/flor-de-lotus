import { ANAMNESIS_STATUS, DisplayStatus, STATUS_LABEL } from "./constants";

type StatusInput = { status: string; dueAt: Date | null; submittedAt?: Date | null };

export function isSubmitted(a: { status: string }): boolean {
  return a.status === ANAMNESIS_STATUS.SUBMITTED || a.status === ANAMNESIS_STATUS.REVIEWED;
}

/** "Atrasada" = ainda não enviada e com prazo vencido. Nunca bloqueia o envio. */
export function isOverdue(a: StatusInput, now = new Date()): boolean {
  return !isSubmitted(a) && !!a.dueAt && a.dueAt.getTime() < now.getTime();
}

export function displayStatus(a: StatusInput, now = new Date()): DisplayStatus {
  if (isOverdue(a, now)) return "OVERDUE";
  return a.status as DisplayStatus;
}

export function statusLabel(a: StatusInput, now = new Date()): string {
  return STATUS_LABEL[displayStatus(a, now)];
}
