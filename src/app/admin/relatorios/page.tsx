import Link from "next/link";
import { prisma } from "@/lib/db";
import { REPORT_TYPE_LABEL } from "@/lib/constants";
import { fmtDateTime } from "@/lib/dates";
import { EmptyState, PageHeader } from "@/components/ui/PageHeader";
import { requireAdminPage } from "@/server/session";

export const metadata = { title: "Relatórios" };

export default async function ReportsPage() {
  await requireAdminPage();
  const reports = await prisma.report.findMany({
    orderBy: { createdAt: "desc" },
    take: 300,
    select: { id: true, type: true, createdAt: true, sizeBytes: true, anamnesis: { select: { id: true, sequence: true, patient: { select: { fullName: true } } } } },
  });
  return (
    <>
      <PageHeader title="Relatórios gerados" subtitle="Histórico de PDFs arquivados. Para gerar um novo, abra a anamnese desejada." />
      {reports.length === 0 ? <EmptyState>Nenhum relatório gerado ainda.</EmptyState> : (
        <div className="card overflow-x-auto">
          <table className="table-base min-w-[640px]">
            <thead><tr><th>Gerado em</th><th>Paciente</th><th>Anamnese</th><th>Tipo</th><th>Tamanho</th><th></th></tr></thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.id}>
                  <td>{fmtDateTime(r.createdAt)}</td>
                  <td>{r.anamnesis.patient.fullName}</td>
                  <td><Link className="link" href={`/admin/anamneses/${r.anamnesis.id}`}>nº {r.anamnesis.sequence}</Link></td>
                  <td>{REPORT_TYPE_LABEL[r.type]}</td>
                  <td>{Math.ceil(r.sizeBytes / 1024)} KB</td>
                  <td><a href={`/api/admin/relatorios/${r.id}`} className="btn-ghost btn-sm">Baixar</a></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
