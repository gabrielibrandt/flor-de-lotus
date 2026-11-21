import Link from "next/link";
import { Search } from "lucide-react";
import { STATUS_LABEL } from "@/lib/constants";
import { fmtDate, fmtDateTime } from "@/lib/dates";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState, PageHeader } from "@/components/ui/PageHeader";
import { listPatients } from "@/server/admin-queries";
import { requireAdminPage } from "@/server/session";

export const metadata = { title: "Pacientes" };

export default async function PatientsPage({ searchParams }: { searchParams: Promise<{ q?: string; situacao?: string; excluida?: string }> }) {
  await requireAdminPage();
  const sp = await searchParams;
  const rows = await listPatients({ q: sp.q, status: sp.situacao });
  return (
    <>
      <PageHeader title="Pacientes" subtitle={`${rows.length} paciente(s)${sp.q || sp.situacao ? " encontrada(s)" : " cadastrada(s)"}`} />
      {sp.excluida && <p role="status" className="mb-4 rounded-xl bg-salvia-50 px-4 py-3 text-sm text-salvia-700">Conta e dados da paciente excluídos.</p>}
      <form className="card mb-6 grid gap-3 p-4 sm:grid-cols-[1fr_14rem_auto]" role="search">
        <label className="relative">
          <span className="sr-only">Buscar por nome ou e-mail</span>
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-salvia-400" aria-hidden />
          <input name="q" defaultValue={sp.q} placeholder="Buscar por nome ou e-mail" className="input pl-9" />
        </label>
        <label>
          <span className="sr-only">Situação da anamnese</span>
          <select name="situacao" defaultValue={sp.situacao ?? ""} className="input">
            <option value="">Todas as situações</option>
            {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
        <div className="flex gap-2">
          <button className="btn-primary">Filtrar</button>
          {(sp.q || sp.situacao) && <Link href="/admin/pacientes" className="btn-ghost">Limpar</Link>}
        </div>
      </form>
      {rows.length === 0 ? (
        <EmptyState>Nenhuma paciente encontrada.</EmptyState>
      ) : (
        <div className="card overflow-x-auto">
          <table className="table-base min-w-[860px]">
            <thead>
              <tr>
                <th>Nome completo</th><th>Prefere ser chamada</th><th>E-mail</th><th>Cadastro</th><th>Anamnese atual</th><th>Última anamnese</th><th>Próximo atendimento</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-bege-50">
                  <td><Link href={`/admin/pacientes/${r.id}`} className="font-semibold text-salvia-800 hover:underline">{r.fullName}</Link></td>
                  <td>{r.preferredName}</td>
                  <td className="text-salvia-600">{r.email}</td>
                  <td>{fmtDate(r.createdAt)}</td>
                  <td>{r.status ? <StatusBadge status={r.status} /> : "—"}</td>
                  <td>{fmtDate(r.lastAnamnesisAt)}</td>
                  <td>{r.nextAppointment ? fmtDateTime(r.nextAppointment) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
