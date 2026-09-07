"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Le detail reste cote serveur : ici on ne dispose que de l'empreinte.
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="font-display text-4xl">Quelque chose a cassé</h1>
      <p className="max-w-sm text-sm leading-relaxed text-[var(--color-muted)]">
        L&apos;erreur a été enregistrée. Réessayez : si elle persiste, elle
        vient de chez nous, pas de vous.
      </p>
      {error.digest && (
        <p className="font-mono text-xs text-[var(--color-muted)]">
          Référence : {error.digest}
        </p>
      )}
      <Button variant="outline" className="mt-2" onClick={reset}>
        Réessayer
      </Button>
    </main>
  );
}
