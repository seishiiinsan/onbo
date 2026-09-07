import Link from "next/link";
import { LogoMark } from "@/components/logo";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <LogoMark size={28} />
      <h1 className="font-display text-4xl">Page introuvable</h1>
      <p className="max-w-sm text-sm leading-relaxed text-[var(--color-muted)]">
        Cette page n&apos;existe pas, ou vous n&apos;y avez pas accès. Si un
        collègue vous a envoyé ce lien, demandez-lui de vous affecter au projet.
      </p>
      <Link href="/app" className="focusable mt-2 rounded-full">
        <Button variant="outline">Retour à mes projets</Button>
      </Link>
    </main>
  );
}
