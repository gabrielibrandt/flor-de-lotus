export function LotusIcon({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 48" className={className} aria-hidden="true">
      <g fill="none" strokeLinejoin="round">
        <path d="M32 44c-8-6-12-14-11-26 6 4 10 11 11 26z" fill="#8ba57f" />
        <path d="M32 44c8-6 12-14 11-26-6 4-10 11-11 26z" fill="#8ba57f" />
        <path d="M32 44C27 34 26 18 32 6c6 12 5 28 0 38z" fill="#5a7151" />
        <path d="M32 44c-12-1-21-7-26-17 9 0 18 6 26 17z" fill="#c9d7c2" />
        <path d="M32 44c12-1 21-7 26-17-9 0-18 6-26 17z" fill="#c9d7c2" />
        <path d="M14 45h36" stroke="#a07a5a" strokeWidth="1.6" strokeLinecap="round" />
      </g>
    </svg>
  );
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LotusIcon className={compact ? "h-7 w-9" : "h-9 w-12"} />
      <span className="leading-tight">
        <span className="block font-serif text-xl font-semibold text-salvia-800">Flor de Lótus</span>
        {!compact && <span className="block text-[11px] uppercase tracking-[0.18em] text-oliva-600">Yoga e Ayurveda para Mulheres</span>}
      </span>
    </span>
  );
}

/** Ramo botânico decorativo. */
export function Leaves({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 60" className={className} aria-hidden="true">
      <path d="M5 50 C 60 40, 120 30, 195 8" stroke="#a9bea0" strokeWidth="1.5" fill="none" />
      {[30, 60, 90, 120, 150].map((x, i) => (
        <g key={x} transform={`translate(${x} ${46 - i * 8}) rotate(${-25 + (i % 2) * 50})`}>
          <path d="M0 0 C 6 -10, 16 -10, 20 0 C 16 6, 6 6, 0 0 Z" fill={i % 2 ? "#c9d7c2" : "#a9bea0"} />
        </g>
      ))}
    </svg>
  );
}
