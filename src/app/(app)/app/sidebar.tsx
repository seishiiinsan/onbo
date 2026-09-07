"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { FolderKanban, LogOut, Menu, Plus, Settings, X } from "lucide-react";
import { logout } from "@/app/actions/auth";
import { Wordmark } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Navigation principale.
 *
 * Desktop : rail fixe — marque, action principale, groupe de navigation,
 * compte en pied. Mobile : barre superieure + tiroir, ferme au changement
 * de route.
 */
const NAV = [
  { href: "/app", label: "Projets", icon: FolderKanban, exact: true },
  { href: "/app/settings", label: "Réglages", icon: Settings, exact: false },
];

type Props = {
  agencyName: string;
  email: string;
  roleLabel: string;
};

export function Sidebar({ agencyName, email, roleLabel }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Le tiroir ne doit jamais survivre a une navigation.
  useEffect(() => setOpen(false), [pathname]);

  const initials = agencyName.slice(0, 2).toUpperCase();

  const content = (
    <div className="flex h-full flex-col gap-6 p-4">
      <Link href="/app" className="focusable hidden rounded-lg md:block">
        <Wordmark />
      </Link>

      <div className="flex items-center gap-2.5 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-2.5">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[var(--color-brand)] text-xs font-semibold text-white">
          {initials}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium">
            {agencyName}
          </span>
          <span className="block truncate text-xs text-[var(--color-muted)]">
            {roleLabel}
          </span>
        </span>
      </div>

      <Link href="/app/projects/new" className="focusable rounded-full">
        <Button variant="accent" className="w-full">
          <Plus size={16} />
          Nouveau projet
        </Button>
      </Link>

      <nav className="flex-1">
        <p className="section-label mb-2 px-3">Pilotage</p>
        <ul className="space-y-0.5">
          {NAV.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "focusable relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-[var(--color-brand-soft)] font-medium text-[var(--color-brand-ink)]"
                      : "text-[var(--color-muted)] hover:bg-black/[0.04] hover:text-[var(--color-ink)]",
                  )}
                >
                  {active && (
                    <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-[var(--color-brand)]" />
                  )}
                  <Icon size={16} className="shrink-0" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-[var(--color-line)] pt-3">
        <p className="truncate px-1 text-xs text-[var(--color-muted)]">
          {email}
        </p>
        <form action={logout}>
          <button
            type="submit"
            className="focusable mt-1 flex w-full items-center gap-2 rounded-lg px-1 py-1.5 text-sm text-[var(--color-muted)] transition-colors hover:text-[var(--color-ink)]"
          >
            <LogOut size={15} />
            Déconnexion
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <>
      {/* Barre mobile */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-[var(--color-line)] bg-[var(--color-surface)] px-4 md:hidden">
        <Link href="/app" className="focusable rounded-lg">
          <Wordmark />
        </Link>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Ouvrir le menu"
          className="focusable rounded-lg p-2 text-[var(--color-muted)]"
        >
          <Menu size={20} />
        </button>
      </header>

      {/* Tiroir mobile */}
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            aria-label="Fermer le menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/25"
          />
          <div className="absolute inset-y-0 left-0 w-72 border-r border-[var(--color-line)] bg-[var(--color-rail)] shadow-xl">
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Fermer le menu"
              className="focusable absolute right-3 top-3 rounded-lg p-2 text-[var(--color-muted)]"
            >
              <X size={18} />
            </button>
            {content}
          </div>
        </div>
      )}

      {/* Rail desktop */}
      <aside className="sticky top-0 hidden h-screen w-[var(--sidebar-width)] shrink-0 border-r border-[var(--color-line)] bg-[var(--color-rail)] md:block">
        {content}
      </aside>
    </>
  );
}
