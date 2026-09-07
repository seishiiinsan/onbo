"use client";

import { useActionState } from "react";
import { createAgency, type AgencyState } from "@/app/actions/agency";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initial: AgencyState = {};

export function AgencyForm() {
  const [state, action, pending] = useActionState(createAgency, initial);

  return (
    <form action={action}>
      <Label htmlFor="name">Nom de l&apos;agence</Label>
      <Input
        id="name"
        name="name"
        placeholder="Studio Bellevue"
        required
        autoFocus
      />
      {state.error && (
        <p className="mt-2 text-sm text-[var(--color-danger)]">{state.error}</p>
      )}

      <Button
        type="submit"
        variant="accent"
        size="lg"
        className="mt-4 w-full"
        disabled={pending}
      >
        {pending ? "Création…" : "Créer l'espace"}
      </Button>

      <p className="mt-4 text-xs text-[var(--color-muted)]">
        Vous pourrez changer le nom, le logo et la couleur à tout moment.
      </p>
    </form>
  );
}
