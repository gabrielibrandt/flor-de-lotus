import { prisma } from "@/lib/db";
import { ROLES } from "@/lib/constants";
import type { Prisma, PrismaClient } from "@/generated/prisma/client";

type Tx = PrismaClient | Prisma.TransactionClient;

export type NotificationInput = { type: string; title: string; body: string; link?: string | null };

export async function notifyUser(userId: string, n: NotificationInput, tx: Tx = prisma) {
  await tx.notification.create({ data: { userId, type: n.type, title: n.title, body: n.body, link: n.link ?? null } });
}

export async function getAdminUserId(tx: Tx = prisma): Promise<string | null> {
  const admin = await tx.user.findFirst({ where: { role: ROLES.ADMIN, isActive: true }, select: { id: true } });
  return admin?.id ?? null;
}

export async function notifyAdmin(n: NotificationInput, tx: Tx = prisma) {
  const adminId = await getAdminUserId(tx);
  if (adminId) await notifyUser(adminId, n, tx);
}

export function unreadCount(userId: string) {
  return prisma.notification.count({ where: { userId, readAt: null } });
}

export function listNotifications(userId: string, opts: { take?: number; onlyUnread?: boolean } = {}) {
  return prisma.notification.findMany({
    where: { userId, ...(opts.onlyUnread ? { readAt: null } : {}) },
    orderBy: { createdAt: "desc" },
    take: opts.take ?? 200,
  });
}

/** Marca como lida — somente se a notificação pertencer à usuária. */
export async function markRead(userId: string, notificationId: string) {
  await prisma.notification.updateMany({ where: { id: notificationId, userId, readAt: null }, data: { readAt: new Date() } });
}

export async function markAllRead(userId: string) {
  await prisma.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } });
}
