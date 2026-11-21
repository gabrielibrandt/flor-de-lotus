import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/server/session";
import { getReportData, renderReportPdf } from "@/server/services/reports";
import { audit } from "@/server/services/audit";
import { isSubmitted } from "@/lib/status";

export const dynamic = "force-dynamic";

/** PDF completo da própria anamnese (sem observações internas). */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const u = await getCurrentUser();
  if (!u || u.role !== "PATIENT" || !u.patientId) return new NextResponse("Não autorizado", { status: 401 });
  const a = await prisma.anamnesis.findFirst({ where: { id, patientId: u.patientId }, select: { id: true, status: true, sequence: true } });
  if (!a || !isSubmitted(a)) return new NextResponse("Não encontrado", { status: 404 });
  const pdf = await renderReportPdf(await getReportData(a.id), "FULL");
  await audit({ actorId: u.id, action: "PATIENT_PDF_DOWNLOADED", entityType: "Anamnesis", entityId: a.id });
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="minha-anamnese-${a.sequence}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
