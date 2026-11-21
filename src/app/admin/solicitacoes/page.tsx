import Link from "next/link";
import { prisma } from "@/lib/db";
import { CORRECTION_STATUS_LABEL, DATA_REQUEST_STATUS_LABEL, DATA_REQUEST_TYPE_LABEL } from "@/lib/constants";
import { fmtDateTime } from "@/lib/dates";
import { resolveDataRequestAction } from "@/app/actions/admin";
import { DataRequestResolve } from "@/components/admin/DataRequestResolve";
import { EmptyState, PageHeader } from "@/components/ui/PageHeader";
import { Pill } from "@/components/ui/StatusBadge";
import { requireAdminPage } from "@/server/session";

export const metadata = { title: "Solicitações" };

export default async function RequestsPage() {
  await requireAdminPage();
  const [corrections, data] = await Promise.all([
    prisma.correctionRequest.findMany({
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 200,
      include: { patient: { select: { fullName: true } }, anamnesis: { select: { sequence: true } }, question: { select: { number: true } } },
    }),
    prisma.dataRequest.findMany({ orderBy: [{ status: "asc" }, { createdAt: "desc" }], take: 200, include: { patient: { select: { id: true, fullName: true } } } }),
  ]);
  const pending = (s: string) => s === "OPEN" || s === "ANSWERED";
  return (
    <>
      <PageHeader title="Solicitações" subtitle="Correções de anamnese e pedidos sobre dados pessoais (LGPD)." />
      <section>
        <h2 className="mb-4 text-2xl">Correções e esclarecimentos</h2>
        {corrections.length === 0 ? <EmptyState>Nenhuma solicitação.</EmptyState> : (
          <div className="card divide-y divide-bege-100">
            {corrections.map((c) => (
              <Link key={c.id} href={`/admin/anamneses/${c.anamnesisId}#correcoes`} className="flex flex-col gap-1 px-5 py-4 hover:bg-bege-50 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-salvia-800">{c.patient.fullName} · anamnese nº {c.anamnesis.sequence}{c.question ? ` · pergunta ${c.question.number}` : ""}</p>
                  <p className="line-clamp-1 text-sm text-salvia-600">{c.origin === "PATIENT" ? "Paciente: " : "Você: "}{c.message}</p>
                  <p className="text-xs text-salvia-400">{fmtDateTime(c.createdAt)}</p>
                </div>
                <Pill tone={pending(c.status) ? "warn" : "ok"}>{CORRECTION_STATUS_LABEL[c.status]}</Pill>
              </Link>
            ))}
          </div>
        )}
      </section>
      <section className="mt-10">
        <h2 className="mb-4 text-2xl">Solicitações sobre dados pessoais</h2>
        <p className="mb-4 text-sm text-salvia-600">
          Para exclusão, use a opção “Excluir conta e dados” na ficha da paciente após avaliar obrigações legais de retenção; depois marque a solicitação como atendida.
        </p>
        {data.length === 0 ? <EmptyState>Nenhuma solicitação.</EmptyState> : (
          <div className="space-y-4">
            {data.map((d) => (
              <div key={d.id} className="card p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-salvia-800">
                    <Link className="hover:underline" href={`/admin/pacientes/${d.patient.id}`}>{d.patient.fullName}</Link> · {DATA_REQUEST_TYPE_LABEL[d.type]}
                  </p>
                  <Pill tone={d.status === "OPEN" ? "warn" : "ok"}>{DATA_REQUEST_STATUS_LABEL[d.status]}</Pill>
                </div>
                {d.details && <p className="mt-2 text-sm text-salvia-700">{d.details}</p>}
                <p className="text-xs text-salvia-400">{fmtDateTime(d.createdAt)}</p>
                {d.response && <p className="mt-2 text-sm text-salvia-600">Resposta: {d.response}</p>}
                {d.status === "OPEN" && <DataRequestResolve action={resolveDataRequestAction.bind(null, d.id)} />}
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
