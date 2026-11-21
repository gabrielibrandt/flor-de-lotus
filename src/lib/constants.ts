export const ROLES = { ADMIN: "ADMIN", PATIENT: "PATIENT" } as const;
export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ANAMNESIS_STATUS = {
  NOT_STARTED: "NOT_STARTED",
  IN_PROGRESS: "IN_PROGRESS",
  SUBMITTED: "SUBMITTED",
  REVIEWED: "REVIEWED",
} as const;
export type StoredStatus = (typeof ANAMNESIS_STATUS)[keyof typeof ANAMNESIS_STATUS];

/** Situação exibida (inclui a situação derivada "Atrasada"). */
export type DisplayStatus = StoredStatus | "OVERDUE";

export const STATUS_LABEL: Record<DisplayStatus, string> = {
  NOT_STARTED: "Não iniciada",
  IN_PROGRESS: "Em andamento",
  SUBMITTED: "Enviada",
  OVERDUE: "Atrasada",
  REVIEWED: "Revisada",
};

export const SKIP_REASONS = {
  NOT_APPLICABLE: "NOT_APPLICABLE",
  PREFER_NOT_TO_ANSWER: "PREFER_NOT_TO_ANSWER",
} as const;
export type SkipReason = (typeof SKIP_REASONS)[keyof typeof SKIP_REASONS];
export const SKIP_LABEL: Record<SkipReason, string> = {
  NOT_APPLICABLE: "Não se aplica",
  PREFER_NOT_TO_ANSWER: "Prefiro não responder",
};

export const CORRECTION_STATUS = {
  OPEN: "OPEN",
  ANSWERED: "ANSWERED",
  RESOLVED: "RESOLVED",
  REJECTED: "REJECTED",
} as const;
export const CORRECTION_STATUS_LABEL: Record<string, string> = {
  OPEN: "Aberta",
  ANSWERED: "Respondida pela paciente",
  RESOLVED: "Resolvida",
  REJECTED: "Não aceita",
};

export const APPOINTMENT_STATUS = { SCHEDULED: "SCHEDULED", COMPLETED: "COMPLETED", CANCELED: "CANCELED" } as const;
export const APPOINTMENT_STATUS_LABEL: Record<string, string> = {
  SCHEDULED: "Agendado",
  COMPLETED: "Realizado",
  CANCELED: "Cancelado",
};

export const DATA_REQUEST_TYPE_LABEL: Record<string, string> = {
  ACCESS: "Acesso aos dados",
  CORRECTION: "Correção de dados cadastrais",
  DELETION: "Exclusão da conta e dos dados",
};
export const DATA_REQUEST_STATUS_LABEL: Record<string, string> = {
  OPEN: "Aberta",
  DONE: "Atendida",
  REJECTED: "Não atendida",
};

export const REPORT_TYPE_LABEL: Record<string, string> = { FULL: "Completo", SUMMARY: "Resumido" };

/** Versão vigente da política de privacidade (registrada no consentimento). */
export const PRIVACY_VERSION = "2026-11";

/** Antecedência do prazo em relação à consulta. */
export const DEADLINE_HOURS = 48;
/** Janela para o aviso "próxima do prazo". */
export const NEAR_DUE_HOURS = 24;

export const SESSION_COOKIE = "fdl_session";
export const SESSION_DAYS = 7;
export const RESET_TOKEN_HOURS = 24;
