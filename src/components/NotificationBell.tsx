"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { markAllReadAction, markReadAction } from "@/app/actions/notifications";

export type BellItem = { id: string; title: string; body: string; link: string | null; createdAt: string; read: boolean };

export function NotificationBell({ count, items, allHref }: { count: number; items: BellItem[]; allHref: string }) {
  const [open, setOpen] = useState(false);
  const [, start] = useTransition();
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey); };
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-full text-salvia-700 hover:bg-salvia-50"
        aria-label={`Notificações${count ? ` (${count} não lidas)` : ""}`}
        aria-expanded={open}
      >
        <Bell className="h-5 w-5" aria-hidden />
        {count > 0 && (
          <span data-testid="unread-count" className="absolute -right-0.5 -top-0.5 min-w-[1.25rem] rounded-full bg-terra-500 px-1 text-center text-[11px] font-bold leading-5 text-white">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-bege-200 bg-white shadow-suave fade-in">
          <div className="flex items-center justify-between border-b border-bege-100 px-4 py-3">
            <p className="font-semibold text-salvia-800">Notificações</p>
            {count > 0 && (
              <button className="text-xs font-semibold text-salvia-600 hover:text-salvia-800" onClick={() => start(() => markAllReadAction())}>
                Marcar todas como lidas
              </button>
            )}
          </div>
          <ul className="max-h-96 overflow-y-auto">
            {items.length === 0 && <li className="px-4 py-6 text-center text-sm text-salvia-500">Nenhuma notificação por aqui.</li>}
            {items.map((n) => (
              <li key={n.id}>
                <button
                  className={`block w-full px-4 py-3 text-left hover:bg-bege-50 ${n.read ? "opacity-70" : ""}`}
                  onClick={() =>
                    start(async () => {
                      if (!n.read) await markReadAction(n.id);
                      setOpen(false);
                      if (n.link) router.push(n.link);
                    })
                  }
                >
                  <span className="flex items-start gap-2">
                    {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-terra-500" aria-label="não lida" />}
                    <span>
                      <span className="block text-sm font-semibold text-salvia-800">{n.title}</span>
                      <span className="block text-xs text-salvia-600">{n.body}</span>
                      <span className="mt-0.5 block text-[11px] text-salvia-400">{n.createdAt}</span>
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <Link href={allHref} onClick={() => setOpen(false)} className="block border-t border-bege-100 px-4 py-3 text-center text-sm font-semibold text-salvia-700 hover:bg-bege-50">
            Ver histórico completo
          </Link>
        </div>
      )}
    </div>
  );
}
