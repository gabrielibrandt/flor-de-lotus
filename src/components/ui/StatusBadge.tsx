import { DisplayStatus, STATUS_LABEL } from "@/lib/constants";

const STYLES: Record<DisplayStatus, string> = {
  NOT_STARTED: "bg-bege-100 text-terra-600",
  IN_PROGRESS: "bg-oliva-100 text-oliva-700",
  SUBMITTED: "bg-salvia-100 text-salvia-700",
  OVERDUE: "bg-terra-400/15 text-terra-700",
  REVIEWED: "bg-salvia-600 text-white",
};

export function StatusBadge({ status }: { status: DisplayStatus }) {
  return <span className={`badge ${STYLES[status]}`}>{STATUS_LABEL[status]}</span>;
}

export function Pill({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "warn" | "ok" | "info" }) {
  const t = {
    neutral: "bg-bege-100 text-salvia-700",
    warn: "bg-terra-400/15 text-terra-700",
    ok: "bg-salvia-100 text-salvia-700",
    info: "bg-oliva-100 text-oliva-700",
  }[tone];
  return <span className={`badge ${t}`}>{children}</span>;
}
