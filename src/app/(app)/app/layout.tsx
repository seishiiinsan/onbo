import Link from "next/link";
import { logout } from "@/app/actions/auth";
import { Wordmark } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { requireTenant } from "@/lib/tenant";
import { NavLink } from "./nav-link";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await requireTenant();
  const initials = ctx.agencyName.slice(0, 2).toUpperCase();

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="flex shrink-0 flex-col border-b border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-4 md:w-60 md:border-b-0 md:border-r md:px-5 md:py-6">
        <Link href="/app" className="mb-6 hidden md:block">
          <Wordmark />
        </Link>

        <div className="flex items-center justify-between gap-3 md:mb-6 md:block">
          <Link href="/app" className="md:hidden">
            <Wordmark />
          </Link>

          <div className="flex items-center gap-2.5 md:rounded-xl md:bg-[var(--color-canvas)] md:p-2.5">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[var(--color-brand)] text-[11px] font-semibold text-white">
              {initials}
            </span>
            <span className="hidden min-w-0 md:block">
              <span className="block truncate text-sm font-medium">
                {ctx.agencyName}
              </span>
              <span className="block truncate text-xs text-[var(--color-muted)]">
                {ctx.email}
              </span>
            </span>
          </div>
        </div>

        <nav className="mt-4 flex gap-1 md:mt-0 md:flex-1 md:flex-col">
          <NavLink href="/app">Projets</NavLink>
          <NavLink href="/app/settings">Réglages</NavLink>
        </nav>

        <form action={logout} className="mt-4 hidden md:block">
          <Button variant="ghost" size="sm" type="submit" className="w-full">
            Déconnexion
          </Button>
        </form>
      </aside>

      <main className="mx-auto w-full max-w-4xl flex-1 px-5 py-8 md:px-10 md:py-12">
        {children}
      </main>
    </div>
  );
}
