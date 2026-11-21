import { NotificationList } from "@/components/NotificationList";
import { PageHeader } from "@/components/ui/PageHeader";
import { requireAdminPage } from "@/server/session";
import { listNotifications } from "@/server/services/notifications";

export const metadata = { title: "Notificações" };

export default async function AdminNotificationsPage() {
  const u = await requireAdminPage();
  const items = await listNotifications(u.id, { take: 500 });
  return (
    <>
      <PageHeader title="Notificações" subtitle="Histórico completo de avisos da plataforma." />
      <NotificationList items={items} />
    </>
  );
}
