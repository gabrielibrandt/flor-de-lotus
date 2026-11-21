import Link from "next/link";
import { prisma } from "@/lib/db";
import { STATUS_LABEL } from "@/lib/constants";
import { fmtDate, fmtDateTime } from "@/lib/dates";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState, PageHeader } from "@/components/ui/PageHeader";
import { listAnamneses } from "@/server/admin-queries";
import { requireAdminPage } from "@/server/session";

export const metadata = { title: "Anamneses" };

export default async function AnamnesesPage({ searchParams }: { searchParams: Promise<{ paciente?: string; de?: string; ate?: string; situacao?: string; novas?: string }> }) {
  await requireAdminPage();
  const sp = await searchParams;
  const [list, patients] = await Promise.all([
    listAnamneses({ patientId: sp.paciente, from: sp.de, to: sp.ate, status: sp.situacao, onlyNew: sp.novas === "1" }),
    prisma.patient.findMany({ select: { id: true, fullName: true }, orderBy: { fullName: "asc" } }),
  ]);
  const filtered = !!(sp.paciente || sp.de || sp.ate || sp.situacao || sp.novas);
  return (
    <>
      <PageHeader title="Anamneses" subtitle={`${list.length} registro(s)`} actions={<Link href="/admin/liberar" className="btn-primary btn-sm">Liberar anamnese</Link>} />
      <form className="card mb-6 grid gap-3 p-4 md:grid-cols-6 md:items-end">
        <div className="md:col-span-2">
          <label className="label" htmlFor="fp">Paciente</label>
          <select id="fp" name="paciente" defaultValue={sp.paciente ?? ""} className="input">
            <option value="">Todas</option>
            {patients.map((p) => <option key={p.id} value={p.id}>{p.fullName}</option>)}
          </select>
        </div>
        <div><label className="label" htmlFor="fde">Liberada de</label><input id="fde" type="date" name="de" defaultValue={sp.de} className="input" /></div>
        <div><label className="label" htmlFor="fate">até</label><input id="fate" type="date" name="ate" defaultValue={sp.ate} className="input" /></div>
        <div>
          <label className="label" htmlFor="fs">Situação</label>
          <select id="fs" name="situacao" defaultValue={sp.situacao ?? ""} className="input">
            <option value="">Todas</option>
            {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="novas" value="1" defaultChecked={sp.novas === "1"} className="h-4 w-4 accent-salvia-600" /> Só novas</label>
          <button className="btn-primary btn-sm">Filtrar</button>
          {filtered && <Link href="/admin/anamneses" className="btn-ghost btn-sm">Limpar</Link>}
        </div>
      </form>
      {list.length === 0 ? <EmptyState>Nenhuma anamnese encontrada.</EmptyState> : (
        <div className="card overflow-x-auto">
          <table className="table-base min-w-[860px]">
            <thead><tr><th>Paciente</th><th>Nº</th><th>Situação</th><th>Liberada</th><th>Consulta</th><th>Prazo</th><th>Enviada</th><th></th></tr></thead>
            <tbody>
              {list.map((a) => (
                <tr key={a.id} className="hover:bg-bege-50">
                  <td>
                    <Link href={`/admin/pacientes/${a.patient.id}`} className="font-semibold text-salvia-800 hover:underline">{a.patient.fullName}</Link>
                    {!a.adminViewedAt && a.submittedAt && <span className="ml-2 badge bg-terra-500 text-white">nova</span>}
                    {a._count.correctionRequests > 0 && <span className="ml-2 badge bg-oliva-100 text-oliva-700">correção</span>}
                  </td>
                  <td>{a.sequence}</td>
                  <td><StatusBadge status={a.display} /></td>
                  <td>{fmtDate(a.createdAt)}</td>
                  <td>{a.consultationAt ? fmtDateTime(a.consultationAt) : "—"}</td>
                  <td>{a.dueAt ? fmtDateTime(a.dueAt) : "Sem prazo"}</td>
                  <td>{a.submittedAt ? <>{fmtDateTime(a.submittedAt)}{a.submittedLate && <span className="ml-1 text-xs text-terra-600">(fora do prazo)</span>}</> : "—"}</td>
                  <td><Link href={`/admin/anamneses/${a.id}`} className="btn-ghost btn-sm">Abrir</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
