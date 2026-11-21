import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/server/session";
import { audit } from "@/server/services/audit";

export const dynamic = "force-dynamic";

/** Download de PDF arquivado — somente para a profissional. */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await getCurrentUser();
  if (!u || u.role !== "ADMIN") return new NextResponse("Não autorizado", { status: 401 });
  const { id } = await params;
  const r = await prisma.report.findUnique({ where: { id } });
  if (!r) return new NextResponse("Não encontrado", { status: 404 });
  await audit({ actorId: u.id, action: "REPORT_DOWNLOADED", entityType: "Report", entityId: r.id });
  return new NextResponse(new Uint8Array(r.pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${r.fileName}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
