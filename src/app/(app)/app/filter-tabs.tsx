"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "actifs", label: "En cours" },
  { key: "attente", label: "À valider" },
  { key: "bloques", label: "Bloqués" },
  { key: "termines", label: "Terminés" },
] as const;

export function FilterTabs({
  current,
  counts,
}: {
  current: string;
  counts: Record<string, number>;
}) {
  return (
    <div className="mb-4 flex flex-wrap gap-1.5">
      {TABS.map((tab) => (
        <Link
          key={tab.key}
          href={`/app?f=${tab.key}`}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] transition-colors",
            current === tab.key
              ? "bg-[var(--color-ink)] text-white"
              : "text-[var(--color-muted)] hover:bg-black/[0.04]",
          )}
        >
          {tab.label}
          <span
            className={cn(
              "tabular-nums",
              current === tab.key
                ? "text-white/60"
                : "text-[var(--color-muted)]/70",
            )}
          >
            {counts[tab.key] ?? 0}
          </span>
        </Link>
      ))}
    </div>
  );
}
