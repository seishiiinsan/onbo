"use client";

import { useActionState } from "react";
import { createProject, type FormState } from "@/app/actions/project";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initial: FormState = {};

const DEFAULT_STEPS = [
  "Assets de marque — logo, charte, photos",
  "Accès techniques — hébergeur, domaine, CMS",
  "Brief projet — objectifs, cible, références",
  "Contenus — textes, mentions légales",
];

export function NewProjectForm() {
  const [state, action, pending] = useActionState(createProject, initial);

  return (
    <Card className="max-w-2xl">
      <CardContent>
        <form action={action}>
          <Label htmlFor="name">Nom du projet</Label>
          <Input
            id="name"
            name="name"
            placeholder="Refonte site Dupont"
            required
            autoFocus
          />

          <div className="mt-5 rounded-xl border border-[var(--color-line)] bg-[var(--color-canvas)] p-4">
            <label className="flex items-start gap-2.5 text-sm font-medium">
              <input
                type="checkbox"
                name="withDefaults"
                defaultChecked
                className="mt-1"
              />
              Partir de la checklist par défaut
            </label>
            <ul className="mt-2.5 space-y-1 pl-7">
              {DEFAULT_STEPS.map((step) => (
                <li key={step} className="text-xs text-[var(--color-muted)]">
                  {step}
                </li>
              ))}
            </ul>
            <p className="mt-2.5 pl-7 text-xs text-[var(--color-muted)]">
              Tout reste modifiable ensuite.
            </p>
          </div>

          <div className="mt-5">
            <Label htmlFor="clientEmail">
              Email du client{" "}
              <span className="font-normal text-[var(--color-muted)]">
                (optionnel)
              </span>
            </Label>
            <Input
              id="clientEmail"
              name="clientEmail"
              type="email"
              placeholder="contact@client.fr"
            />
            <label className="mt-2.5 flex items-start gap-2.5 text-sm">
              <input
                type="checkbox"
                name="sendLink"
                defaultChecked
                className="mt-1"
              />
              Lui envoyer le lien du portail tout de suite
            </label>
          </div>

          {state.error && (
            <p className="mt-3 text-sm text-[var(--color-danger)]">
              {state.error}
            </p>
          )}

          <Button
            type="submit"
            variant="accent"
            className="mt-5"
            disabled={pending}
          >
            {pending ? "Création…" : "Créer le projet"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
