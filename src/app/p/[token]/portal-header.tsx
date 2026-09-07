"use client";

import { Printer } from "lucide-react";
import type { Locale } from "@/lib/portal-i18n";
import { ProgressBar } from "@/components/ui/progress";

/**
 * En-tete du portail : marque de l'agence et progression collante (item 27),
 * pour que le client sache toujours ou il en est.
 */
export function PortalHeader({
  agencyName,
  logoUrl,
  progress,
  summary,
}: {
  agencyName: string;
  logoUrl: string | null;
  progress: number;
  summary: string;
  locale: Locale;
  token: string;
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-[var(--color-line)] bg-[var(--color-surface)]/95 backdrop-blur">
      {/* Bandeau aux couleurs de l'agence : le portail est le sien. */}
      <div className="h-1 bg-[var(--color-brand)]" />

      <div className="mx-auto flex max-w-3xl items-center gap-3 px-5 py-3">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt={agencyName}
            className="h-10 w-auto shrink-0 object-contain"
          />
        ) : (
          <>
            <span
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[var(--color-brand)] text-xs font-semibold text-white"
              aria-hidden
            >
              {agencyName.slice(0, 2).toUpperCase()}
            </span>
            <span className="truncate font-display text-xl">{agencyName}</span>
          </>
        )}

        <div className="ml-auto flex min-w-0 flex-1 items-center gap-3">
          <div className="min-w-24 flex-1">
            <ProgressBar value={progress} />
          </div>
          <span className="shrink-0 text-xs tabular-nums text-[var(--color-muted)]">
            {progress} %
          </span>
        </div>

        <button
          type="button"
          onClick={() => window.print()}
          aria-label="Imprimer"
          className="no-print focusable rounded-lg p-1.5 text-[var(--color-muted)] hover:text-[var(--color-ink)]"
        >
          <Printer size={16} />
        </button>
      </div>

      <p className="mx-auto max-w-3xl px-5 pb-2 text-xs text-[var(--color-muted)]">
        {summary}
      </p>
    </header>
  );
}
