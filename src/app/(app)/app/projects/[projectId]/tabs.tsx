"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Onglets du projet.
 *
 * La page portait trop d'informations rarement consultees. L'onglet actif
 * passe par l'URL : une vue se partage et le retour navigateur fonctionne.
 */
export const TABS = [
  { key: "general", label: "Général" },
  { key: "equipe", label: "Équipe" },
  { key: "client", label: "Client" },
  { key: "logs", label: "Journal" },
] as const;

export type TabKey = (typeof TABS)[number]["key"] | "reglages";

export function ProjectTabs({
  current,
  counts,
  showTeam,
}: {
  current: TabKey;
  counts: { equipe: number; client: number };
  showTeam: boolean;
}) {
  const pathname = usePathname();
  const params = useSearchParams();

  const href = (tab: string) => {
    const next = new URLSearchParams(params.toString());
    if (tab === "general") next.delete("t");
    else next.set("t", tab);
    const query = next.toString();
    return query ? `${pathname}?${query}` : pathname;
  };

  const visible = TABS.filter((tab) => tab.key !== "equipe" || showTeam);

  return (
    <div className="mb-6 flex flex-wrap items-center gap-1 border-b border-[var(--color-line)]">
      {visible.map((tab) => {
        const active = current === tab.key;
        const count =
          tab.key === "equipe"
            ? counts.equipe
            : tab.key === "client"
              ? counts.client
              : null;

        return (
          <Link
            key={tab.key}
            href={href(tab.key)}
            aria-current={active ? "page" : undefined}
            className={cn(
              "focusable -mb-px rounded-t-lg border-b-2 px-3 py-2 text-sm transition-colors",
              active
                ? "border-[var(--color-brand)] font-medium text-[var(--color-ink)]"
                : "border-transparent text-[var(--color-muted)] hover:text-[var(--color-ink)]",
            )}
          >
            {tab.label}
            {count !== null && count > 0 && (
              <span className="ml-1.5 text-xs text-[var(--color-muted)]">
                {count}
              </span>
            )}
          </Link>
        );
      })}

      <Link
        href={href("reglages")}
        aria-current={current === "reglages" ? "page" : undefined}
        title="Réglages du projet"
        className={cn(
          "focusable -mb-px ml-auto rounded-t-lg border-b-2 px-3 py-2 text-sm transition-colors",
          current === "reglages"
            ? "border-[var(--color-brand)] font-medium text-[var(--color-ink)]"
            : "border-transparent text-[var(--color-muted)] hover:text-[var(--color-ink)]",
        )}
      >
        <SlidersHorizontal size={15} />
      </Link>
    </div>
  );
}
