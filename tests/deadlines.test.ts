import { describe, expect, it } from "vitest";
import { computeDueAt, fmtDateTime, parseLocalDateTime } from "@/lib/dates";
import { displayStatus, isOverdue } from "@/lib/status";

describe("cálculo do prazo de 48 horas", () => {
  it("consulta 20/11/2026 às 14h → prazo 18/11/2026 às 14h", () => {
    const consulta = parseLocalDateTime("2026-11-20", "14:00");
    const prazo = computeDueAt(consulta);
    expect(fmtDateTime(prazo)).toBe("18/11/2026 às 14h00");
    expect(consulta.getTime() - prazo.getTime()).toBe(48 * 3600 * 1000);
  });

  it("interpreta o horário no fuso de São Paulo (UTC−3)", () => {
    expect(parseLocalDateTime("2026-11-20", "14:00").toISOString()).toBe("2026-11-20T17:00:00.000Z");
  });

  it("vira o mês corretamente", () => {
    expect(fmtDateTime(computeDueAt(parseLocalDateTime("2026-12-01", "09:30")))).toBe("29/11/2026 às 09h30");
  });

  it("identifica atrasada somente quando não enviada e com prazo vencido", () => {
    const now = new Date("2026-11-19T12:00:00Z");
    const due = new Date("2026-11-18T17:00:00Z");
    expect(isOverdue({ status: "IN_PROGRESS", dueAt: due }, now)).toBe(true);
    expect(displayStatus({ status: "NOT_STARTED", dueAt: due }, now)).toBe("OVERDUE");
    expect(isOverdue({ status: "SUBMITTED", dueAt: due }, now)).toBe(false);
    expect(isOverdue({ status: "IN_PROGRESS", dueAt: null }, now)).toBe(false);
  });
});
