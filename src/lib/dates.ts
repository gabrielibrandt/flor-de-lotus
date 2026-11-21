import { fromZonedTime, formatInTimeZone } from "date-fns-tz";
import { DEADLINE_HOURS } from "./constants";

export const TIMEZONE = process.env.APP_TIMEZONE || "America/Sao_Paulo";
const HOUR = 60 * 60 * 1000;

/** Prazo de envio: exatamente 48 horas antes da consulta. */
export function computeDueAt(consultationAt: Date): Date {
  return new Date(consultationAt.getTime() - DEADLINE_HOURS * HOUR);
}

/** Converte data ("2026-11-20") e hora ("14:00") digitadas no fuso da clínica para um instante UTC. */
export function parseLocalDateTime(date: string, time: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
    throw new Error("Data ou horário inválido.");
  }
  const d = fromZonedTime(`${date}T${time}:00`, TIMEZONE);
  if (Number.isNaN(d.getTime())) throw new Error("Data ou horário inválido.");
  return d;
}

export function toLocalDateInput(d: Date): string {
  return formatInTimeZone(d, TIMEZONE, "yyyy-MM-dd");
}
export function toLocalTimeInput(d: Date): string {
  return formatInTimeZone(d, TIMEZONE, "HH:mm");
}

export function fmtDate(d: Date | null | undefined): string {
  return d ? formatInTimeZone(d, TIMEZONE, "dd/MM/yyyy") : "—";
}
export function fmtDateTime(d: Date | null | undefined): string {
  return d ? formatInTimeZone(d, TIMEZONE, "dd/MM/yyyy 'às' HH'h'mm") : "—";
}
export function fmtTime(d: Date): string {
  return formatInTimeZone(d, TIMEZONE, "HH:mm");
}
export function fmtLong(d: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: TIMEZONE, weekday: "long", day: "numeric", month: "long", year: "numeric",
  }).format(d);
}

/** Início do dia (00:00 no fuso da clínica) da data local informada. */
export function startOfLocalDay(date: string): Date {
  return parseLocalDateTime(date, "00:00");
}

/** Soma dias a uma data local "yyyy-MM-dd" (sem depender de fuso). */
export function addDaysLocal(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

/** Dia da semana (0 = domingo) de uma data local "yyyy-MM-dd". */
export function weekdayLocal(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function todayLocal(): string {
  return toLocalDateInput(new Date());
}

export function hoursUntil(target: Date, now = new Date()): number {
  return (target.getTime() - now.getTime()) / HOUR;
}
