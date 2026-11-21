import { prisma } from "@/lib/db";
import { fmtDateTime } from "@/lib/dates";
import { PageHeader } from "@/components/ui/PageHeader";
import { requireAdminPage } from "@/server/session";

export const metadata = { title: "Auditoria" };

const LABELS: Record<string, string> = {
  PATIENT_REGISTERED: "Cadastro de paciente",
  ANAMNESIS_SUBMITTED: "Envio de anamnese",
  ANAMNESIS_RELEASED: "Liberação de anamnese",
  ANAMNESIS_REVIEWED: "Anamnese marcada como revisada",
  ANAMNESIS_VIEWED: "Anamnese consultada",
  ANSWER_CORRECTED: "Correção de resposta",
  CONSULTATION_SET: "Consulta vinculada",
  CORRECTION_REQUESTED: "Pedido de correção (paciente)",
  CLARIFICATION_REQUESTED: "Pedido de esclarecimento",
  CLARIFICATION_ANSWERED: "Esclarecimento respondido",
  CORRECTION_RESOLVED: "Correção resolvida",
  CORRECTION_REJECTED: "Correção não aceita",
  NOTE_ADDED: "Observação adicionada",
  NOTE_UPDATED: "Observação editada",
  NOTE_DELETED: "Observação excluída",
  REPORT_GENERATED: "Relatório gerado",
  REPORT_DOWNLOADED: "Relatório baixado",
  PATIENT_PDF_DOWNLOADED: "PDF baixado pela paciente",
  ADMIN_LOGIN: "Login administrativo",
  ADMIN_LOGIN_FAILED: "Falha de login administrativo",
  LOGIN_FAILED: "Falha de login",
  ADMIN_PROVISIONED: "Conta administrativa criada",
  PASSWORD_CHANGED: "Senha alterada",
  PASSWORD_RESET_REQUESTED: "Pedido de redefinição de senha",
  PASSWORD_RESET_LINK_CREATED: "Link de redefinição gerado",
  PASSWORD_RESET_COMPLETED: "Senha redefinida",
  PROFILE_UPDATED: "Dados cadastrais atualizados",
  DATA_EXPORTED: "Exportação de dados (LGPD)",
  DATA_REQUEST_CREATED: "Solicitação LGPD registrada",
  DATA_REQUEST_DONE: "Solicitação LGPD atendida",
  DATA_REQUEST_REJECTED: "Solicitação LGPD não atendida",
  PATIENT_DATA_DELETED: "Exclusão de dados de paciente",
  APPOINTMENT_CREATED: "Compromisso criado",
  APPOINTMENT_UPDATED: "Compromisso editado",
  APPOINTMENT_COMPLETED: "Atendimento realizado",
  APPOINTMENT_CANCELED: "Compromisso cancelado",
  APPOINTMENT_SCHEDULED: "Compromisso reagendado",
};

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  await requireAdminPage();
  const page = Math.max(1, Number((await searchParams).p ?? 1) || 1);
  const take = 100;
  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, skip: (page - 1) * take, take, include: { actor: { select: { name: true, role: true } } } }),
    prisma.auditLog.count(),
  ]);
  return (
    <>
      <PageHeader title="Registro de auditoria" subtitle="Ações importantes registradas pelo sistema (sem conteúdo das respostas)." />
      <div className="card overflow-x-auto">
        <table className="table-base min-w-[720px]">
          <thead><tr><th>Data</th><th>Ação</th><th>Responsável</th><th>Registro</th></tr></thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id}>
                <td className="whitespace-nowrap">{fmtDateTime(l.createdAt)}</td>
                <td>{LABELS[l.action] ?? l.action}</td>
                <td>{l.actor ? `${l.actor.name}${l.actor.role === "ADMIN" ? " (profissional)" : ""}` : "—"}</td>
                <td className="font-mono text-xs text-salvia-500">{l.entityType}{l.entityId ? ` · ${l.entityId.slice(-8)}` : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex justify-between text-sm">
        {page > 1 ? <a className="link" href={`?p=${page - 1}`}>← Mais recentes</a> : <span />}
        {page * take < total ? <a className="link" href={`?p=${page + 1}`}>Mais antigos →</a> : <span />}
      </div>
    </>
  );
}
