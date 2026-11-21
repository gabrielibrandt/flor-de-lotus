import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/session";
import { exportPatientData } from "@/server/services/privacy";

export const dynamic = "force-dynamic";

export async function GET() {
  const u = await getCurrentUser();
  if (!u || u.role !== "PATIENT" || !u.patientId) return new NextResponse("Não autorizado", { status: 401 });
  const data = await exportPatientData(u.patientId);
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="meus-dados-flor-de-lotus.json"`,
      "Cache-Control": "private, no-store",
    },
  });
}
