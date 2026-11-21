import { Download } from "lucide-react";
import { prisma } from "@/lib/db";
import { DATA_REQUEST_STATUS_LABEL, DATA_REQUEST_TYPE_LABEL } from "@/lib/constants";
import { fmtDate, fmtDateTime } from "@/lib/dates";
import { changePasswordAction, dataRequestAction, updateProfileAction } from "@/app/actions/patient";
import { DataRequestForm, PasswordForm, ProfileForm } from "@/components/patient/AccountForms";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pill } from "@/components/ui/StatusBadge";
import { requirePatientPage } from "@/server/session";

export const metadata = { title: "Minha conta" };

export default async function AccountPage() {
  const u = await requirePatientPage();
  const p = await prisma.patient.findUniqueOrThrow({
    where: { id: u.patientId },
    include: { user: { select: { email: true } }, dataRequests: { orderBy: { createdAt: "desc" } } },
  });
  return (
    <>
      <PageHeader title="Minha conta" subtitle={`Conta criada em ${fmtDate(p.createdAt)}.`} />
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-6">
          <h2 className="mb-4 text-2xl">Dados cadastrais</h2>
          <ProfileForm action={updateProfileAction} defaults={{ fullName: p.fullName, preferredName: p.preferredName, email: p.user.email }} />
        </section>
        <section className="card p-6">
          <h2 className="mb-4 text-2xl">Senha</h2>
          <PasswordForm action={changePasswordAction} />
        </section>
        <section className="card p-6 lg:col-span-2" id="privacidade">
          <h2 className="text-2xl">Privacidade e dados (LGPD)</h2>
          <p className="mt-2 text-sm text-salvia-600">
            Consentimento registrado em {fmtDateTime(p.consentAt)} (política versão {p.privacyVersion}). Você pode baixar uma cópia
            dos seus dados a qualquer momento ou registrar uma solicitação de correção ou exclusão.
          </p>
          <a href="/api/paciente/exportar" className="btn-secondary btn-sm mt-4"><Download className="h-4 w-4" aria-hidden /> Baixar meus dados (JSON)</a>
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <DataRequestForm action={dataRequestAction} />
            <div>
              <p className="label">Minhas solicitações</p>
              {p.dataRequests.length === 0 ? (
                <p className="text-sm text-salvia-500">Nenhuma solicitação registrada.</p>
              ) : (
                <ul className="space-y-3">
                  {p.dataRequests.map((d) => (
                    <li key={d.id} className="rounded-xl bg-bege-50 p-3 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-salvia-800">{DATA_REQUEST_TYPE_LABEL[d.type]}</span>
                        <Pill tone={d.status === "OPEN" ? "warn" : "ok"}>{DATA_REQUEST_STATUS_LABEL[d.status]}</Pill>
                      </div>
                      <p className="text-xs text-salvia-500">{fmtDateTime(d.createdAt)}</p>
                      {d.response && <p className="mt-1 text-salvia-700">Retorno: {d.response}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
