"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { LayoutGrid, Table2 } from "lucide-react";
import { Input, Select } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "actifs", label: "En cours" },
  { key: "attente", label: "À valider" },
  { key: "bloques", label: "Bloqués" },
  { key: "termines", label: "Terminés" },
  { key: "archives", label: "Archivés" },
] as const;

/**
 * Filtres, recherche, tri et mode d'affichage (items 8, 9, 11, 13, 14).
 * Tout passe par l'URL : une vue se partage et survit au rechargement.
 */
export function DashboardControls({
  counts,
}: {
  counts: Record<string, number>;
}) {
  const router = useRouter();
  const params = useSearchParams();

  const current = params.get("f") ?? "actifs";
  const view = params.get("v") ?? "list";
  const group = params.get("g") ?? "none";
  const sort = params.get("s") ?? "activity";

  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("p");
    router.push(`/app?${next.toString()}`);
  };

  return (
    <div className="mb-5 space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => update("f", tab.key)}
            className={cn(
              "focusable inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] transition-colors",
              current === tab.key
                ? "bg-[var(--color-ink)] text-[var(--color-canvas)]"
                : "text-[var(--color-muted)] hover:bg-black/[0.04]",
            )}
          >
            {tab.label}
            <span className="tabular-nums opacity-70">
              {counts[tab.key] ?? 0}
            </span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          defaultValue={params.get("q") ?? ""}
          onChange={(event) => {
            const value = event.target.value;
            // Petit delai pour ne pas pousser une URL a chaque frappe.
            window.clearTimeout(
              (window as unknown as { __onboSearch?: number }).__onboSearch,
            );
            (window as unknown as { __onboSearch?: number }).__onboSearch =
              window.setTimeout(() => update("q", value), 250);
          }}
          placeholder="Filtrer par nom…"
          className="h-9 w-52"
        />

        <Select
          aria-label="Trier"
          value={sort}
          onChange={(event) => update("s", event.target.value)}
          className="h-9 w-48"
        >
          <option value="activity">Dernière activité</option>
          <option value="progress">Avancement</option>
          <option value="due">Échéance</option>
          <option value="name">Nom</option>
        </Select>

        <Select
          aria-label="Grouper"
          value={group}
          onChange={(event) => update("g", event.target.value)}
          className="h-9 w-44"
        >
          <option value="none">Sans groupement</option>
          <option value="client">Par client</option>
        </Select>

        <div className="ml-auto flex gap-0.5 rounded-lg border border-[var(--color-line)] p-0.5">
          <button
            type="button"
            aria-label="Vue liste"
            aria-pressed={view === "list"}
            onClick={() => update("v", "list")}
            className={cn(
              "focusable rounded-md p-1.5",
              view === "list"
                ? "bg-[var(--color-brand-soft)] text-[var(--color-brand-ink)]"
                : "text-[var(--color-muted)]",
            )}
          >
            <LayoutGrid size={14} />
          </button>
          <button
            type="button"
            aria-label="Vue tableau"
            aria-pressed={view === "table"}
            onClick={() => update("v", "table")}
            className={cn(
              "focusable rounded-md p-1.5",
              view === "table"
                ? "bg-[var(--color-brand-soft)] text-[var(--color-brand-ink)]"
                : "text-[var(--color-muted)]",
            )}
          >
            <Table2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
