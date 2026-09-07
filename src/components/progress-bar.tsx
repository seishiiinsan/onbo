export function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-canvas)]">
      <div
        className="h-full rounded-full bg-[var(--color-accent)] transition-[width]"
        style={{ width: `${value}%` }}
      />
    </div>
  );
}
