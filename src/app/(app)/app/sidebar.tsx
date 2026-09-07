"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import {
  ChevronsLeft,
  ChevronsRight,
  FolderKanban,
  LogOut,
  Menu,
  Plus,
  Search,
  Settings,
  X,
} from "lucide-react";
import { switchAgency } from "@/app/actions/agency";
import { logout } from "@/app/actions/auth";
import { LogoMark, Wordmark } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Navigation principale.
 *
 * Desktop : rail fixe repliable (item 5) — marque, action principale,
 * navigation avec compteur (item 6), compte en pied (item 7).
 * Mobile : barre superieure et tiroir, ferme au changement de route.
 */
const NAV = [
  { href: "/app", label: "Projets", icon: FolderKanban, exact: true },
  { href: "/app/settings", label: "Réglages", icon: Settings, exact: false },
];

type Props = {
  agencyName: string;
  email: string;
  roleLabel: string;
  /** Etapes en attente de validation, tous projets visibles confondus. */
  awaitingCount: number;
  agencies: { id: string; name: string; active: boolean }[];
};

export function Sidebar({
  agencyName,
  email,
  roleLabel,
  awaitingCount,
  agencies,
}: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [switching, startSwitch] = useTransition();

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem("onbo-rail") === "collapsed");
    } catch {}
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((value) => {
      const next = !value;
      try {
        localStorage.setItem("onbo-rail", next ? "collapsed" : "expanded");
      } catch {}
      return next;
    });
  };

  const initials = agencyName.slice(0, 2).toUpperCase();

  const content = (compact: boolean) => (
    <div className="flex h-full flex-col gap-5 p-3.5">
      <div className="flex items-center justify-between">
        <Link href="/app" className="focusable rounded-lg">
          {compact ? <LogoMark size={22} /> : <Wordmark />}
        </Link>
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label={compact ? "Déplier le menu" : "Replier le menu"}
          className="focusable hidden rounded-lg p-1 text-[var(--color-muted)] hover:text-[var(--color-ink)] md:block"
        >
          {compact ? <ChevronsRight size={15} /> : <ChevronsLeft size={15} />}
        </button>
      </div>

      {/* Selecteur d'espace (item 2) */}
      <div>
        {agencies.length > 1 && !compact ? (
          <select
            aria-label="Espace agence"
            value={agencies.find((agency) => agency.active)?.id}
            disabled={switching}
            onChange={(event) => {
              const id = event.target.value;
              startSwitch(() => {
                void switchAgency(id);
              });
            }}
            className="focusable w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-2.5 text-sm"
          >
            {agencies.map((agency) => (
              <option key={agency.id} value={agency.id}>
                {agency.name}
              </option>
            ))}
          </select>
        ) : (
          <div
            className={cn(
              "flex items-center gap-2.5 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-2.5",
              compact && "justify-center px-0",
            )}
            title={compact ? agencyName : undefined}
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[var(--color-brand)] text-[11px] font-semibold text-white">
              {initials}
            </span>
            {!compact && (
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">
                  {agencyName}
                </span>
                <span className="block truncate text-xs text-[var(--color-muted)]">
                  {roleLabel}
                </span>
              </span>
            )}
          </div>
        )}
      </div>

      <Link href="/app/projects/new" className="focusable rounded-full">
        <Button variant="accent" className="w-full" title="Nouveau projet (N)">
          <Plus size={16} />
          {!compact && "Nouveau projet"}
        </Button>
      </Link>

      <nav className="flex-1">
        {!compact && <p className="section-label mb-2 px-3">Pilotage</p>}
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
                  title={compact ? item.label : undefined}
                  className={cn(
                    "focusable relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                    compact && "justify-center px-0",
                    active
                      ? "bg-[var(--color-brand-soft)] font-medium text-[var(--color-brand-ink)]"
                      : "text-[var(--color-muted)] hover:bg-black/[0.04] hover:text-[var(--color-ink)]",
                  )}
                >
                  {active && !compact && (
                    <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-[var(--color-brand)]" />
                  )}
                  <Icon size={16} className="shrink-0" />
                  {!compact && item.label}

                  {/* Compteur des etapes a valider (item 6) */}
                  {item.exact && awaitingCount > 0 && (
                    <span
                      className={cn(
                        "ml-auto rounded-full bg-[var(--color-submitted-soft)] px-1.5 py-0.5 text-[11px] font-medium text-[var(--color-submitted)]",
                        compact && "absolute right-1 top-1 ml-0 px-1 py-0",
                      )}
                    >
                      {awaitingCount}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>

        {!compact && (
          <p className="mt-4 px-3 text-[11px] leading-relaxed text-[var(--color-muted)]">
            <Search size={11} className="mr-1 inline" />
            ⌘K pour rechercher · N pour un nouveau projet
          </p>
        )}
      </nav>

      <div className="space-y-2 border-t border-[var(--color-line)] pt-3">
        {!compact && (
          <>
            <p className="truncate px-1 text-xs text-[var(--color-muted)]">
              {email}
            </p>
            <ThemeToggle />
          </>
        )}
        <form action={logout}>
          <button
            type="submit"
            title="Déconnexion"
            className={cn(
              "focusable flex w-full items-center gap-2 rounded-lg px-1 py-1.5 text-sm text-[var(--color-muted)] transition-colors hover:text-[var(--color-ink)]",
              compact && "justify-center px-0",
            )}
          >
            <LogOut size={15} />
            {!compact && "Déconnexion"}
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <>
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
            {content(false)}
          </div>
        </div>
      )}

      <aside
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 border-r border-[var(--color-line)] bg-[var(--color-rail)] transition-[width] md:block",
          collapsed ? "w-16" : "w-[var(--sidebar-width)]",
        )}
      >
        {content(collapsed)}
      </aside>
    </>
  );
}
