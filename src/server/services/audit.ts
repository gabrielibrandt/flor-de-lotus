import { prisma } from "@/lib/db";
import type { Prisma, PrismaClient } from "@/generated/prisma/client";

type Tx = PrismaClient | Prisma.TransactionClient;

/** Registra uma ação importante. Nunca inclua conteúdo de respostas em `details`. */
export async function audit(
  entry: { actorId?: string | null; action: string; entityType: string; entityId?: string | null; details?: Record<string, unknown> },
  tx: Tx = prisma,
) {
  await tx.auditLog.create({
    data: {
      actorId: entry.actorId ?? null,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId ?? null,
      details: entry.details ? JSON.stringify(entry.details) : null,
    },
  });
}
