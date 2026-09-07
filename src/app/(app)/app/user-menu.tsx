"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { LogOut, Settings, User } from "lucide-react";
import { logout } from "@/app/actions/auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

/**
 * Carte compte en pied de rail, avec menu au clic.
 * Les entrees rarement utilisees (reglages, profil, deconnexion) sortent de
 * la navigation principale pour ne pas concurrencer les projets.
 */
export function UserMenu({
  name,
  email,
  compact,
}: {
  name: string;
  email: string;
  compact: boolean;
}) {
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onClick = (event: MouseEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const initials =
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || email.slice(0, 2).toUpperCase();

  return (
    <div ref={container} className="relative">
      {open && (
        <div
          role="menu"
          className="absolute bottom-full left-0 z-40 mb-2 w-56 overflow-hidden rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-1.5 shadow-xl"
        >
          <Link
            href="/app/settings"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="focusable flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm hover:bg-[var(--color-canvas)]"
          >
            <Settings size={15} className="text-[var(--color-muted)]" />
            Paramètres
          </Link>

          <Link
            href="/app/settings#profil"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="focusable flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm hover:bg-[var(--color-canvas)]"
          >
            <User size={15} className="text-[var(--color-muted)]" />
            Mon profil
          </Link>

          <div className="my-1.5 border-t border-[var(--color-line)]" />

          <div className="px-1.5 pb-1.5">
            <ThemeToggle />
          </div>

          <div className="my-1.5 border-t border-[var(--color-line)]" />

          <form action={logout}>
            <button
              type="submit"
              role="menuitem"
              className="focusable flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-[var(--color-canvas)]"
            >
              <LogOut size={15} className="text-[var(--color-muted)]" />
              Déconnexion
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        title={compact ? `${name} · ${email}` : undefined}
        className={cn(
          "focusable flex w-full items-center gap-2.5 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-2 text-left transition-colors hover:border-[var(--color-line-strong)]",
          compact && "justify-center",
        )}
      >
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[var(--color-brand)] text-[11px] font-semibold text-white">
          {initials}
        </span>

        {!compact && (
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{name}</span>
            <span className="block truncate text-xs text-[var(--color-muted)]">
              {email}
            </span>
          </span>
        )}
      </button>
    </div>
  );
}
