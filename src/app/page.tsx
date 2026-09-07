import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-5xl font-bold tracking-tight">Onbo</h1>
      <p className="max-w-md text-[var(--color-muted)]">
        Portail d&apos;onboarding client pour agences web. Un lien, une
        checklist, zéro relance manuelle.
      </p>
      <Link href="/login">
        <Button variant="accent" size="lg">
          Accéder à mon espace
        </Button>
      </Link>
      <code className="text-xs text-[var(--color-muted)]">
        Next.js 15 · Prisma · PostgreSQL · Docker
      </code>
    </main>
  );
}
