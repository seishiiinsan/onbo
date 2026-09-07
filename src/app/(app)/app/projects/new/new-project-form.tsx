"use client";

import { useActionState } from "react";
import { createProject, type FormState } from "@/app/actions/project";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initial: FormState = {};

export function NewProjectForm() {
  const [state, action, pending] = useActionState(createProject, initial);

  return (
    <Card className="max-w-lg">
      <CardContent>
        <form action={action}>
          <Label htmlFor="name">Nom du projet</Label>
          <Input
            id="name"
            name="name"
            placeholder="Refonte site Dupont"
            required
          />

          <label className="mt-4 flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              name="withDefaults"
              defaultChecked
              className="mt-0.5"
            />
            <span>
              Créer la checklist par défaut
              <span className="block text-xs text-[var(--color-muted)]">
                Assets · Accès · Brief · Contenus
              </span>
            </span>
          </label>

          {state.error && (
            <p className="mt-2 text-sm text-red-600">{state.error}</p>
          )}

          <Button
            type="submit"
            variant="accent"
            className="mt-4"
            disabled={pending}
          >
            {pending ? "Création…" : "Créer le projet"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
