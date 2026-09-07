import Link from "next/link";
import { logout } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { requireTenant } from "@/lib/tenant";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await requireTenant();

  return (
    <div className="min-h-screen">
      <header className="border-b border-[var(--color-line)] bg-white">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
          <div className="flex items-center gap-6">
            <Link href="/app" className="font-bold tracking-tight">
              Onbo
            </Link>
            <span className="text-sm text-[var(--color-muted)]">
              {ctx.agencyName}
            </span>
          </div>
          <nav className="flex items-center gap-1">
            <Link href="/app">
              <Button variant="ghost" size="sm">
                Projets
              </Button>
            </Link>
            <Link href="/app/settings">
              <Button variant="ghost" size="sm">
                Réglages
              </Button>
            </Link>
            <form action={logout}>
              <Button variant="ghost" size="sm" type="submit">
                Déconnexion
              </Button>
            </form>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
