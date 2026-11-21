import Link from "next/link";
import { notFound } from "next/navigation";
import { fmtDate, fmtDateTime } from "@/lib/dates";
import { generateReportAction } from "@/app/actions/admin";
import { ReportButtons } from "@/components/admin/AnamnesisForms";
import { PrintButton } from "@/components/PrintButton";
import { LotusIcon } from "@/components/ui/Logo";
import { requireAdminPage } from "@/server/session";
import { getReportData } from "@/server/services/reports";
import { NotFoundError } from "@/lib/errors";

export const metadata = { title: "Relatório" };

export default async function ReportPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tipo?: string }> }) {
  await requireAdminPage();
  const { id } = await params;
  const { tipo } = await searchParams;
  const type = tipo === "resumido" ? "SUMMARY" : "FULL";
  let data;
  try {
    data = await getReportData(id);
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }
  const sections = type === "FULL" ? data.full : data.summary;

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 no-print">
        <div className="flex gap-2">
          <Link href={`/admin/anamneses/${id}`} className="btn-ghost btn-sm">← Voltar à anamnese</Link>
          <Link href={`?tipo=${type === "FULL" ? "resumido" : "completo"}`} className="btn-ghost btn-sm">Ver {type === "FULL" ? "resumido" : "completo"}</Link>
        </div>
        <div className="flex flex-wrap gap-2">
          <PrintButton />
          <ReportButtons full={generateReportAction.bind(null, id, "FULL")} summary={generateReportAction.bind(null, id, "SUMMARY")} />
        </div>
      </div>

      <article className="card p-6 sm:p-10 print:p-0">
        <header className="flex items-start justify-between gap-4 border-b border-bege-200 pb-5">
          <div className="flex items-center gap-3">
            <LotusIcon className="h-10 w-14" />
            <div>
              <p className="font-serif text-2xl text-salvia-800">Flor de Lótus</p>
              <p className="text-[11px] uppercase tracking-[0.18em] text-oliva-600">Yoga e Ayurveda para Mulheres</p>
            </div>
          </div>
          <p className="text-right text-xs text-salvia-500">Gerado em {fmtDateTime(new Date())}</p>
        </header>

        <h1 className="mt-6 text-3xl">{type === "FULL" ? "Relatório completo da anamnese" : "Relatório resumido da anamnese"}</h1>
        <p className="mt-2 text-sm text-salvia-600">
          {type === "FULL"
            ? "Reprodução integral das perguntas e respostas fornecidas pela paciente, sem resumo, reescrita, interpretação ou diagnóstico."
            : "Organização das respostas por tema para consulta rápida durante o atendimento. As palavras da paciente são preservadas; não há interpretação, conclusão clínica nem uso de inteligência artificial."}
        </p>

        <dl className="mt-6 grid gap-x-8 gap-y-2 rounded-2xl bg-bege-50 p-5 text-sm sm:grid-cols-2">
          {[
            ["Paciente", data.patient.fullName],
            ["Como gosta de ser chamada", data.patient.preferredName],
            ["Cadastro em", fmtDate(data.patient.createdAt)],
            ["Anamnese", `nº ${data.anamnesis.sequence} — ${data.anamnesis.status}`],
            ["Início do preenchimento", fmtDateTime(data.anamnesis.startedAt)],
            ["Envio", data.anamnesis.submittedAt ? `${fmtDateTime(data.anamnesis.submittedAt)}${data.anamnesis.submittedLate ? " (fora do prazo)" : ""}` : "Não enviada"],
            ["Consulta relacionada", data.anamnesis.consultationAt ? fmtDateTime(data.anamnesis.consultationAt) : "Sem consulta vinculada"],
            ["Prazo de envio", data.anamnesis.dueAt ? fmtDateTime(data.anamnesis.dueAt) : "Sem prazo definido"],
          ].map(([k, v]) => (
            <div key={k} className="flex gap-2"><dt className="w-44 shrink-0 font-semibold text-terra-600">{k}</dt><dd className="text-salvia-800">{v}</dd></div>
          ))}
        </dl>

        {data.unanswered.length > 0 && (
          <p className="mt-4 rounded-xl bg-bege-100 px-4 py-3 text-sm font-semibold text-terra-700">
            Perguntas não respondidas ou incompletas: {data.unanswered.join(", ")}.
          </p>
        )}

        <div className="mt-8 space-y-8">
          {sections.map((s) => (
            <section key={s.title} className="break-inside-avoid-page">
              <h2 className="rounded-lg bg-salvia-100 px-4 py-2 text-sm font-bold uppercase tracking-widest text-salvia-700" style={{ fontFamily: "inherit" }}>{s.title}</h2>
              <div className={type === "SUMMARY" ? "mt-3 grid gap-3 md:grid-cols-2" : "mt-4 space-y-5"}>
                {s.items.map((it) => (
                  <div key={it.number} className={type === "SUMMARY" ? "rounded-xl border border-bege-200 p-4" : ""}>
                    <p className={`font-semibold text-oliva-700 ${type === "SUMMARY" ? "text-sm" : ""}`}>{it.number}. {type === "FULL" ? it.text : it.shortLabel}</p>
                    <div className="mt-1.5 space-y-1 text-[15px] leading-relaxed text-salvia-900">
                      {it.parts.length === 0 ? (
                        <p className="italic text-terra-600">Não respondida.</p>
                      ) : (
                        it.parts.map((p, i) => (
                          <p key={i} className="whitespace-pre-wrap break-words">{p.label && <span className="font-semibold text-terra-600">{p.label}: </span>}{p.text}</p>
                        ))
                      )}
                      {it.partial && <p className="text-xs italic text-terra-600">Resposta incompleta.</p>}
                      {it.correctedAt && <p className="text-xs italic text-salvia-500">Resposta corrigida pela profissional em {fmtDateTime(it.correctedAt)}.</p>}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
        <footer className="mt-10 border-t border-bege-200 pt-4 text-xs text-salvia-500">Documento confidencial — contém dados pessoais sensíveis (LGPD).</footer>
      </article>
    </>
  );
}
