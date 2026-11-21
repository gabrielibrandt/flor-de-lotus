import "server-only";
import { fmtDateTime } from "@/lib/dates";
import { listNotifications, unreadCount } from "@/server/services/notifications";
import type { BellItem } from "@/components/NotificationBell";

export async function bellData(userId: string): Promise<{ count: number; items: BellItem[] }> {
  const [count, list] = await Promise.all([unreadCount(userId), listNotifications(userId, { take: 8 })]);
  return {
    count,
    items: list.map((n) => ({ id: n.id, title: n.title, body: n.body, link: n.link, createdAt: fmtDateTime(n.createdAt), read: !!n.readAt })),
  };
}
