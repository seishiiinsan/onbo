/** Marque Onbo : un anneau ouvert qui se referme — l'onboarding qui se complete. */
export function LogoMark({ size = 22 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className="shrink-0"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray="42 14"
        transform="rotate(-45 12 12)"
      />
      <circle cx="12" cy="12" r="3" fill="currentColor" />
    </svg>
  );
}

export function Wordmark() {
  return (
    <span className="flex items-center gap-2 text-[var(--color-brand)]">
      <LogoMark />
      <span className="font-display text-lg tracking-tight text-[var(--color-ink)]">
        Onbo
      </span>
    </span>
  );
}
