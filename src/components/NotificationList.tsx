import Link from "next/link";
import { markAllReadAction, markReadAction } from "@/app/actions/notifications";
import { fmtDateTime } from "@/lib/dates";
import { EmptyState } from "@/components/ui/PageHeader";

type N = { id: string; title: string; body: string; link: string | null; createdAt: Date; readAt: Date | null };

export function NotificationList({ items }: { items: N[] }) {
  const unread = items.filter((n) => !n.readAt).length;
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-bege-100 px-5 py-4">
        <p className="text-sm text-salvia-600">{unread} não lida(s) · {items.length} no histórico</p>
        {unread > 0 && (
          <form action={markAllReadAction}>
            <button className="btn-secondary btn-sm">Marcar todas como lidas</button>
          </form>
        )}
      </div>
      {items.length === 0 ? (
        <div className="p-5"><EmptyState>Nenhuma notificação.</EmptyState></div>
      ) : (
        <ul>
          {items.map((n) => (
            <li key={n.id} className={`flex flex-col gap-2 border-b border-bege-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between ${n.readAt ? "" : "bg-bege-50/70"}`}>
              <div>
                <p className="font-semibold text-salvia-800">
                  {!n.readAt && <span className="mr-2 inline-block h-2 w-2 rounded-full bg-terra-500 align-middle" aria-label="não lida" />}
                  {n.title}
                </p>
                <p className="text-sm text-salvia-600">{n.body}</p>
                <p className="text-xs text-salvia-400">{fmtDateTime(n.createdAt)}{n.readAt ? ` · lida em ${fmtDateTime(n.readAt)}` : ""}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                {n.link && <Link href={n.link} className="btn-ghost btn-sm">Abrir</Link>}
                {!n.readAt && (
                  <form action={markReadAction.bind(null, n.id)}>
                    <button className="btn-secondary btn-sm">Marcar como lida</button>
                  </form>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
