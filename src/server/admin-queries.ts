import "server-only";
import { prisma } from "@/lib/db";
import { ANAMNESIS_STATUS, DisplayStatus } from "@/lib/constants";
import { displayStatus, isOverdue, isSubmitted } from "@/lib/status";
import { startOfLocalDay } from "@/lib/dates";

type MiniAnamnesis = { id: string; sequence: number; status: string; dueAt: Date | null; submittedAt: Date | null; createdAt: Date };

/** Situação "atual" da paciente: a anamnese aberta mais antiga; se não houver, a última enviada. */
export function currentAnamnesis(list: MiniAnamnesis[]): MiniAnamnesis | null {
  const open = list.filter((a) => !isSubmitted(a)).sort((a, b) => a.sequence - b.sequence);
  if (open.length) return open[0];
  return [...list].sort((a, b) => b.sequence - a.sequence)[0] ?? null;
}

export async function dashboardStats(adminId: string) {
  const now = new Date();
  const [patients, all, corrections, unread, upcoming, recentSubmitted] = await Promise.all([
    prisma.patient.count(),
    prisma.anamnesis.findMany({ select: { status: true, dueAt: true, submittedAt: true, adminViewedAt: true } }),
    prisma.correctionRequest.count({ where: { status: { in: ["OPEN", "ANSWERED"] }, OR: [{ origin: "PATIENT" }, { status: "ANSWERED" }] } }),
    prisma.notification.count({ where: { userId: adminId, readAt: null } }),
    prisma.appointment.findMany({
      where: { startsAt: { gte: now }, status: "SCHEDULED" },
      orderBy: { startsAt: "asc" },
      take: 6,
      include: { patient: { select: { id: true, fullName: true, preferredName: true } }, anamnesis: { select: { id: true, status: true, dueAt: true } } },
    }),
    prisma.anamnesis.findMany({
      where: { status: { in: [ANAMNESIS_STATUS.SUBMITTED, ANAMNESIS_STATUS.REVIEWED] } },
      orderBy: { submittedAt: "desc" },
      take: 6,
      include: { patient: { select: { fullName: true } } },
    }),
  ]);
  const counts: Record<DisplayStatus, number> = { NOT_STARTED: 0, IN_PROGRESS: 0, SUBMITTED: 0, OVERDUE: 0, REVIEWED: 0 };
  for (const a of all) counts[displayStatus(a, now)]++;
  const received = all.filter((a) => isSubmitted(a)).length;
  const unseen = all.filter((a) => isSubmitted(a) && !a.adminViewedAt).length;
  return {
    patients,
    received,
    unseen,
    pending: counts.NOT_STARTED + counts.IN_PROGRESS + counts.OVERDUE,
    counts,
    corrections,
    unread,
    upcoming,
    recentSubmitted,
  };
}

export type PatientRow = Awaited<ReturnType<typeof listPatients>>[number];

export async function listPatients(opts: { q?: string; status?: string }) {
  const q = opts.q?.trim();
  const now = new Date();
  const patients = await prisma.patient.findMany({
    where: q
      ? { OR: [{ fullName: { contains: q } }, { preferredName: { contains: q } }, { user: { email: { contains: q.toLowerCase() } } }] }
      : undefined,
    include: {
      user: { select: { email: true } },
      anamneses: { select: { id: true, sequence: true, status: true, dueAt: true, submittedAt: true, createdAt: true } },
      appointments: { where: { startsAt: { gte: now }, status: "SCHEDULED" }, orderBy: { startsAt: "asc" }, take: 1, select: { startsAt: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  const rows = patients.map((p) => {
    const cur = currentAnamnesis(p.anamneses);
    const lastSubmitted = p.anamneses.filter((a) => a.submittedAt).sort((a, b) => b.submittedAt!.getTime() - a.submittedAt!.getTime())[0];
    return {
      id: p.id,
      fullName: p.fullName,
      preferredName: p.preferredName,
      email: p.user.email,
      createdAt: p.createdAt,
      status: cur ? displayStatus(cur, now) : null,
      lastAnamnesisAt: lastSubmitted?.submittedAt ?? null,
      nextAppointment: p.appointments[0]?.startsAt ?? null,
      overdue: p.anamneses.some((a) => isOverdue(a, now)),
    };
  });
  if (opts.status) return rows.filter((r) => r.status === opts.status);
  return rows;
}

export async function listAnamneses(opts: { patientId?: string; from?: string; to?: string; status?: string; onlyNew?: boolean }) {
  const now = new Date();
  const created: { gte?: Date; lt?: Date } = {};
  try {
    if (opts.from) created.gte = startOfLocalDay(opts.from);
    if (opts.to) created.lt = new Date(startOfLocalDay(opts.to).getTime() + 24 * 3600 * 1000);
  } catch {
    /* datas inválidas são ignoradas */
  }
  const list = await prisma.anamnesis.findMany({
    where: {
      ...(opts.patientId ? { patientId: opts.patientId } : {}),
      ...(created.gte || created.lt ? { createdAt: created } : {}),
      ...(opts.onlyNew ? { adminViewedAt: null, status: { in: ["SUBMITTED", "REVIEWED"] } } : {}),
    },
    include: { patient: { select: { id: true, fullName: true, preferredName: true } }, _count: { select: { correctionRequests: { where: { status: { in: ["OPEN", "ANSWERED"] } } } } } },
    orderBy: [{ createdAt: "desc" }],
  });
  const withStatus = list.map((a) => ({ ...a, display: displayStatus(a, now) }));
  return opts.status ? withStatus.filter((a) => a.display === opts.status) : withStatus;
}
