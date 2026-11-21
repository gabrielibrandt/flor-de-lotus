import Link from "next/link";
import { prisma } from "@/lib/db";
import { LotusIcon } from "@/components/ui/Logo";
import { requirePatientPage } from "@/server/session";

export const metadata = { title: "Boas-vindas" };

export default async function WelcomePage() {
  const u = await requirePatientPage();
  const first = await prisma.anamnesis.findFirst({ where: { patientId: u.patientId }, orderBy: { sequence: "asc" } });
  return (
    <div className="mx-auto max-w-2xl">
      <div className="card p-8 text-center sm:p-12">
        <LotusIcon className="mx-auto h-14 w-20" />
        <h1 className="mt-4 text-4xl">Que bom ter você aqui, {u.preferredName}!</h1>
        <p className="mt-4 text-lg leading-relaxed text-salvia-700">
          Sua conta foi criada e sua <strong>primeira anamnese</strong> já está disponível. Ela leva cerca de 30 minutos e
          suas respostas são salvas automaticamente — você pode começar agora ou quando preferir.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          {first && <Link href={`/paciente/anamneses/${first.id}`} className="btn-primary px-7 py-3 text-base">Começar agora</Link>}
          <Link href="/paciente" className="btn-secondary px-7 py-3 text-base">Deixar para depois</Link>
        </div>
      </div>
    </div>
  );
}
