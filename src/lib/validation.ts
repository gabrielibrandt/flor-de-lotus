import { z } from "zod";

export const emailSchema = z
  .string({ error: "Informe o e-mail." })
  .trim()
  .toLowerCase()
  .min(1, "Informe o e-mail.")
  .max(254, "E-mail muito longo.")
  .pipe(z.email("Informe um e-mail válido."));

const name = (label: string) =>
  z.string().trim().min(2, `Informe ${label}.`).max(160, `${label[0].toUpperCase() + label.slice(1)} muito longo.`);

export const registerSchema = z
  .object({
    fullName: name("o nome completo"),
    preferredName: name("como gosta de ser chamada"),
    email: emailSchema,
    password: z.string().min(1, "Informe a senha."),
    confirmPassword: z.string().min(1, "Confirme a senha."),
    consent: z.literal("on", { error: "É necessário aceitar a política de privacidade para continuar." }),
  })
  .refine((d) => d.password === d.confirmPassword, { path: ["confirmPassword"], message: "As senhas não coincidem." });

export const profileSchema = z.object({
  fullName: name("o nome completo"),
  preferredName: name("como gosta de ser chamada"),
  email: emailSchema,
});

export const releaseSchema = z.object({
  patientId: z.string().min(1, "Selecione uma paciente."),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe a data da consulta."),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Informe o horário da consulta."),
  appointmentId: z.string().optional().nullable(),
  addToAgenda: z.boolean().default(true),
});

export const appointmentSchema = z.object({
  title: z.string().trim().min(2, "Informe um título.").max(160),
  description: z.string().trim().max(2000).optional().nullable(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe a data."),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Informe o horário."),
  durationMin: z.coerce.number().int().min(5, "Duração mínima de 5 minutos.").max(24 * 60, "Duração máxima de 24 horas."),
  patientId: z.string().optional().nullable(),
  privateNotes: z.string().trim().max(5000).optional().nullable(),
});

export function firstError(err: z.ZodError): string {
  return err.issues[0]?.message ?? "Dados inválidos.";
}

export function fieldErrors(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const e of err.issues) {
    const k = String(e.path[0] ?? "_");
    if (!out[k]) out[k] = e.message;
  }
  return out;
}
