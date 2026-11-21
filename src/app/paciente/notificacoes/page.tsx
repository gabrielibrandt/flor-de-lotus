import { NotificationList } from "@/components/NotificationList";
import { PageHeader } from "@/components/ui/PageHeader";
import { requirePatientPage } from "@/server/session";
import { listNotifications } from "@/server/services/notifications";

export const metadata = { title: "Notificações" };

export default async function PatientNotificationsPage() {
  const u = await requirePatientPage();
  const items = await listNotifications(u.id);
  return (
    <>
      <PageHeader title="Notificações" subtitle="Avisos sobre suas anamneses e solicitações." />
      <NotificationList items={items} />
    </>
  );
}
