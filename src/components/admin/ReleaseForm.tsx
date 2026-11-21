"use client";

import { useState } from "react";
import { ActionForm, ConfirmSubmit, FormAction } from "@/components/ui/forms";

function preview(date: string, time: string) {
  if (!date || !time) return null;
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  // cálculo apenas ilustrativo; o valor oficial é calculado no servidor
  const due = new Date(Date.UTC(y, m - 1, d - 2, hh, mm));
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(due.getUTCDate())}/${p(due.getUTCMonth() + 1)}/${due.getUTCFullYear()} às ${p(due.getUTCHours())}h${p(due.getUTCMinutes())}`;
}

export function ReleaseForm({
  action, patients, defaults,
}: {
  action: FormAction;
  patients: { id: string; fullName: string; openCount: number }[];
  defaults: { patientId?: string; date?: string; time?: string; appointmentId?: string; appointmentLabel?: string };
}) {
  const [patientId, setPatientId] = useState(defaults.patientId ?? "");
  const [date, setDate] = useState(defaults.date ?? "");
  const [time, setTime] = useState(defaults.time ?? "");
  const due = preview(date, time);
  const sel = patients.find((p) => p.id === patientId);
  return (
    <ActionForm action={action} className="space-y-5">
      {defaults.appointmentId && (
        <>
          <input type="hidden" name="appointmentId" value={defaults.appointmentId} />
          <p className="rounded-xl bg-oliva-50 px-4 py-3 text-sm text-oliva-800">Usando os dados do compromisso: <strong>{defaults.appointmentLabel}</strong></p>
        </>
      )}
      <div>
        <label className="label" htmlFor="r-p">1. Paciente <span className="text-terra-500" aria-hidden>*</span></label>
        <select id="r-p" name="patientId" className="input" value={patientId} onChange={(e) => setPatientId(e.target.value)} required disabled={!!defaults.appointmentId}>
          <option value="">Selecione…</option>
          {patients.map((p) => <option key={p.id} value={p.id}>{p.fullName}</option>)}
        </select>
        {defaults.appointmentId && <input type="hidden" name="patientId" value={patientId} />}
        {sel && sel.openCount > 0 && (
          <p className="hint text-terra-600">Atenção: esta paciente já tem {sel.openCount} anamnese(s) não enviada(s). A nova liberação cria um registro adicional e não altera as anteriores.</p>
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="r-d">2. Data da consulta <span className="text-terra-500" aria-hidden>*</span></label>
          <input id="r-d" type="date" name="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} required readOnly={!!defaults.appointmentId} />
        </div>
        <div>
          <label className="label" htmlFor="r-t">3. Horário <span className="text-terra-500" aria-hidden>*</span></label>
          <input id="r-t" type="time" name="time" className="input" value={time} onChange={(e) => setTime(e.target.value)} required readOnly={!!defaults.appointmentId} />
        </div>
      </div>
      {!defaults.appointmentId && (
        <label className="flex items-center gap-2 text-sm text-salvia-700">
          <input type="checkbox" name="addToAgenda" defaultChecked className="h-4 w-4 accent-salvia-600" /> Criar também o compromisso na agenda
        </label>
      )}
      <div className="rounded-2xl bg-bege-50 p-4 text-sm">
        <p className="text-salvia-600">Prazo de envio calculado (48 horas antes da consulta):</p>
        <p className="mt-1 font-serif text-2xl text-salvia-800">{due ?? "—"}</p>
      </div>
      <ConfirmSubmit message={`Confirmar a liberação de uma nova anamnese${sel ? ` para ${sel.fullName}` : ""}? A paciente será notificada na plataforma.`} confirmLabel="Liberar anamnese">
        4. Confirmar liberação
      </ConfirmSubmit>
    </ActionForm>
  );
}
