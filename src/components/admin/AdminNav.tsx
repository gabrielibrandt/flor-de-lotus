"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, ClipboardList, FileText, Home, Inbox, ScrollText, Send, Users, Bell } from "lucide-react";

const ITEMS = [
  { href: "/admin", label: "Visão geral", icon: Home, exact: true },
  { href: "/admin/pacientes", label: "Pacientes", icon: Users },
  { href: "/admin/anamneses", label: "Anamneses", icon: ClipboardList },
  { href: "/admin/liberar", label: "Liberar anamnese", icon: Send },
  { href: "/admin/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/admin/solicitacoes", label: "Solicitações", icon: Inbox },
  { href: "/admin/relatorios", label: "Relatórios", icon: FileText },
  { href: "/admin/notificacoes", label: "Notificações", icon: Bell },
  { href: "/admin/auditoria", label: "Auditoria", icon: ScrollText },
];

export function AdminNav({ badges }: { badges: Record<string, number> }) {
  const path = usePathname();
  return (
    <nav aria-label="Painel administrativo" className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
      {ITEMS.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? path === href : path.startsWith(href);
        const b = badges[href];
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex shrink-0 items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition ${
              active ? "bg-salvia-600 text-white" : "text-salvia-700 hover:bg-salvia-50"
            }`}
          >
            <Icon className="h-4 w-4" aria-hidden />
            <span>{label}</span>
            {b ? <span className={`ml-auto rounded-full px-2 text-xs ${active ? "bg-white/25" : "bg-terra-500 text-white"}`}>{b}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}
