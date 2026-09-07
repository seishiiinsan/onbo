"use client";

import { useActionState } from "react";
import { createAgency, type AgencyState } from "@/app/actions/agency";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initial: AgencyState = {};

export function AgencyForm() {
  const [state, action, pending] = useActionState(createAgency, initial);

  return (
    <Card>
      <CardContent>
        <form action={action}>
          <Label htmlFor="name">Nom de l&apos;agence</Label>
          <Input id="name" name="name" placeholder="Studio Bellevue" required />
          {state.error && (
            <p className="mt-2 text-sm text-red-600">{state.error}</p>
          )}
          <Button
            type="submit"
            variant="accent"
            className="mt-4 w-full"
            disabled={pending}
          >
            {pending ? "Création…" : "Créer l'espace"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
