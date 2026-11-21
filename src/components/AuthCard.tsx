import { LotusIcon } from "@/components/ui/Logo";

export function AuthCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-md px-5 py-10 fade-in">
      <div className="card p-7 sm:p-9">
        <LotusIcon className="mx-auto h-10 w-14" />
        <h1 className="mt-3 text-center text-3xl">{title}</h1>
        {subtitle && <p className="mt-2 text-center text-sm text-salvia-600">{subtitle}</p>}
        <div className="mt-7">{children}</div>
      </div>
    </div>
  );
}
