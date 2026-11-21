"use client";

import { ActionForm, FormAction, SubmitButton } from "@/components/ui/forms";

export type ApptDefaults = { title?: string; description?: string; date?: string; time?: string; durationMin?: number; patientId?: string; privateNotes?: string };

export function AppointmentForm({ action, patients, defaults, submitLabel, lockPatient }: {
  action: FormAction; patients: { id: string; fullName: string; preferredName: string }[]; defaults: ApptDefaults; submitLabel: string; lockPatient?: boolean;
}) {
  return (
    <ActionForm action={action} className="space-y-4">
      <div>
        <label className="label" htmlFor="a-pat">Paciente (opcional)</label>
        <select id="a-pat" name="patientId" defaultValue={defaults.patientId ?? ""} className="input" disabled={lockPatient}>
          <option value="">Sem paciente vinculada</option>
          {patients.map((p) => <option key={p.id} value={p.id}>{p.fullName}</option>)}
        </select>
        {lockPatient && <input type="hidden" name="patientId" value={defaults.patientId ?? ""} />}
      </div>
      <div>
        <label className="label" htmlFor="a-title">Título <span className="text-terra-500" aria-hidden>*</span></label>
        <input id="a-title" name="title" defaultValue={defaults.title ?? "Consulta"} className="input" required />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div><label className="label" htmlFor="a-date">Data <span className="text-terra-500" aria-hidden>*</span></label><input id="a-date" type="date" name="date" defaultValue={defaults.date} className="input" required /></div>
        <div><label className="label" htmlFor="a-time">Horário <span className="text-terra-500" aria-hidden>*</span></label><input id="a-time" type="time" name="time" defaultValue={defaults.time} className="input" required /></div>
        <div><label className="label" htmlFor="a-dur">Duração (min)</label><input id="a-dur" type="number" min={5} max={1440} step={5} name="durationMin" defaultValue={defaults.durationMin ?? 60} className="input" /></div>
      </div>
      <div>
        <label className="label" htmlFor="a-desc">Descrição</label>
        <textarea id="a-desc" name="description" defaultValue={defaults.description} className="textarea min-h-[80px]" />
      </div>
      <div>
        <label className="label" htmlFor="a-notes">Observações privadas</label>
        <textarea id="a-notes" name="privateNotes" defaultValue={defaults.privateNotes} className="textarea min-h-[80px]" />
      </div>
      <SubmitButton>{submitLabel}</SubmitButton>
    </ActionForm>
  );
}
