import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { addDaysLocal, fmtTime, startOfLocalDay, toLocalDateInput, todayLocal, weekdayLocal } from "@/lib/dates";
import { APPOINTMENT_STATUS_LABEL } from "@/lib/constants";
import { PageHeader } from "@/components/ui/PageHeader";
import { requireAdminPage } from "@/server/session";
import { listAppointments } from "@/server/services/appointments";

export const metadata = { title: "Agenda" };

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

type View = "dia" | "semana" | "mes";

function label(view: View, date: string) {
  const [y, m, d] = date.split("-").map(Number);
  if (view === "mes") return `${MONTHS[m - 1]} de ${y}`;
  if (view === "dia") return `${WEEKDAYS[weekdayLocal(date)]}, ${d} de ${MONTHS[m - 1]} de ${y}`;
  const start = addDaysLocal(date, -weekdayLocal(date));
  const end = addDaysLocal(start, 6);
  const f = (s: string) => { const [, mm, dd] = s.split("-").map(Number); return `${dd}/${String(mm).padStart(2, "0")}`; };
  return `Semana de ${f(start)} a ${f(end)}/${end.slice(0, 4)}`;
}

function shift(view: View, date: string, dir: number) {
  if (view === "dia") return addDaysLocal(date, dir);
  if (view === "semana") return addDaysLocal(date, 7 * dir);
  const [y, m] = date.split("-").map(Number);
  const nm = new Date(Date.UTC(y, m - 1 + dir, 1));
  return nm.toISOString().slice(0, 10);
}

export default async function AgendaPage({ searchParams }: { searchParams: Promise<{ vista?: string; data?: string }> }) {
  await requireAdminPage();
  const sp = await searchParams;
  const view: View = sp.vista === "dia" || sp.vista === "mes" ? sp.vista : "semana";
  const date = sp.data && /^\d{4}-\d{2}-\d{2}$/.test(sp.data) ? sp.data : todayLocal();
  const today = todayLocal();

  let days: string[];
  if (view === "dia") days = [date];
  else if (view === "semana") {
    const start = addDaysLocal(date, -weekdayLocal(date));
    days = Array.from({ length: 7 }, (_, i) => addDaysLocal(start, i));
  } else {
    const first = `${date.slice(0, 7)}-01`;
    const start = addDaysLocal(first, -weekdayLocal(first));
    days = Array.from({ length: 42 }, (_, i) => addDaysLocal(start, i));
  }
  const appts = await listAppointments(startOfLocalDay(days[0]), startOfLocalDay(addDaysLocal(days[days.length - 1], 1)));
  const byDay = new Map<string, typeof appts>();
  for (const a of appts) {
    const k = toLocalDateInput(a.startsAt);
    byDay.set(k, [...(byDay.get(k) ?? []), a]);
  }
  const href = (v: View, d: string) => `/admin/agenda?vista=${v}&data=${d}`;
  const tone = (s: string) => (s === "CANCELED" ? "bg-bege-100 text-salvia-400 line-through" : s === "COMPLETED" ? "bg-salvia-100 text-salvia-700" : "bg-oliva-100 text-oliva-800");

  return (
    <>
      <PageHeader title="Agenda" subtitle="Organização interna dos seus compromissos. Não é visível para as pacientes."
        actions={<Link href={`/admin/agenda/novo?data=${date}`} className="btn-primary btn-sm"><Plus className="h-4 w-4" aria-hidden /> Novo compromisso</Link>} />

      <div className="card mb-4 flex flex-wrap items-center justify-between gap-3 p-3">
        <div className="flex items-center gap-1">
          <Link href={href(view, shift(view, date, -1))} className="btn-ghost btn-sm" aria-label="Anterior"><ChevronLeft className="h-4 w-4" /></Link>
          <Link href={href(view, today)} className="btn-secondary btn-sm">Hoje</Link>
          <Link href={href(view, shift(view, date, 1))} className="btn-ghost btn-sm" aria-label="Próximo"><ChevronRight className="h-4 w-4" /></Link>
          <p className="ml-2 font-serif text-xl capitalize text-salvia-800">{label(view, date)}</p>
        </div>
        <div className="flex rounded-full bg-bege-100 p-1" role="tablist" aria-label="Visualização">
          {(["dia", "semana", "mes"] as View[]).map((v) => (
            <Link key={v} href={href(v, date)} role="tab" aria-selected={v === view}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold ${v === view ? "bg-white text-salvia-800 shadow-sm" : "text-salvia-600"}`}>
              {v === "dia" ? "Dia" : v === "semana" ? "Semana" : "Mês"}
            </Link>
          ))}
        </div>
      </div>

      {view === "dia" && (
        <div className="card p-5">
          {(byDay.get(date) ?? []).length === 0 ? (
            <p className="py-10 text-center text-salvia-500">Nenhum compromisso neste dia. <Link className="link" href={`/admin/agenda/novo?data=${date}`}>Adicionar</Link></p>
          ) : (
            <ol className="space-y-3">
              {(byDay.get(date) ?? []).map((a) => (
                <li key={a.id}>
                  <Link href={`/admin/agenda/${a.id}`} className="flex gap-4 rounded-xl border border-bege-200 p-4 hover:bg-bege-50">
                    <div className="w-20 shrink-0 text-right">
                      <p className="font-serif text-2xl text-salvia-800">{fmtTime(a.startsAt)}</p>
                      <p className="text-xs text-salvia-500">{a.durationMin} min</p>
                    </div>
                    <div className="border-l border-bege-200 pl-4">
                      <p className={`font-semibold ${a.status === "CANCELED" ? "line-through text-salvia-400" : "text-salvia-800"}`}>{a.title}</p>
                      {a.patient && <p className="text-sm text-salvia-600">{a.patient.fullName}</p>}
                      {a.description && <p className="text-sm text-salvia-500">{a.description}</p>}
                      <span className={`badge mt-1 ${tone(a.status)}`}>{APPOINTMENT_STATUS_LABEL[a.status]}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}

      {view === "semana" && (
        <div className="grid gap-3 md:grid-cols-7">
          {days.map((d) => (
            <div key={d} className={`card min-h-[10rem] p-3 ${d === today ? "ring-2 ring-salvia-300" : ""}`}>
              <Link href={href("dia", d)} className="mb-2 flex items-baseline justify-between text-sm hover:underline">
                <span className="font-semibold text-salvia-600">{WEEKDAYS[weekdayLocal(d)]}</span>
                <span className="font-serif text-xl text-salvia-800">{Number(d.slice(8))}</span>
              </Link>
              <ul className="space-y-1.5">
                {(byDay.get(d) ?? []).map((a) => (
                  <li key={a.id}>
                    <Link href={`/admin/agenda/${a.id}`} className={`block rounded-lg px-2 py-1.5 text-xs ${tone(a.status)}`}>
                      <span className="font-bold">{fmtTime(a.startsAt)}</span> {a.patient?.preferredName ?? a.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {view === "mes" && (
        <div className="card overflow-hidden">
          <div className="grid grid-cols-7 border-b border-bege-200 bg-bege-50 text-center text-xs font-semibold text-salvia-600">
            {WEEKDAYS.map((w) => <div key={w} className="py-2">{w}</div>)}
          </div>
          <div className="grid grid-cols-7">
            {days.map((d) => {
              const inMonth = d.slice(0, 7) === date.slice(0, 7);
              const list = byDay.get(d) ?? [];
              return (
                <div key={d} className={`min-h-[5.5rem] border-b border-r border-bege-100 p-1.5 ${inMonth ? "" : "bg-bege-50/50 text-salvia-300"}`}>
                  <Link href={href("dia", d)} className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${d === today ? "bg-salvia-600 text-white" : ""}`}>{Number(d.slice(8))}</Link>
                  <ul className="mt-1 space-y-0.5">
                    {list.slice(0, 3).map((a) => (
                      <li key={a.id}><Link href={`/admin/agenda/${a.id}`} className={`block truncate rounded px-1 text-[11px] ${tone(a.status)}`}>{fmtTime(a.startsAt)} {a.patient?.preferredName ?? a.title}</Link></li>
                    ))}
                    {list.length > 3 && <li><Link href={href("dia", d)} className="text-[11px] text-salvia-500">+{list.length - 3} mais</Link></li>}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
