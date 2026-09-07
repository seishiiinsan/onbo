"use client";

import { useActionState } from "react";
import { updateBranding, type AgencyState } from "@/app/actions/agency";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initial: AgencyState = {};

type Props = {
  canEdit: boolean;
  agency: {
    name: string;
    slug: string;
    logoUrl: string;
    accentColor: string;
  };
};

export function BrandingForm({ canEdit, agency }: Props) {
  const [state, action, pending] = useActionState(updateBranding, initial);

  return (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle>Identité</CardTitle>
        <span className="text-xs text-[var(--color-muted)]">
          Appliquée au portail client
        </span>
      </CardHeader>
      <CardContent>
        <form action={action}>
          <div className="mb-4">
            <Label htmlFor="name">Nom</Label>
            <Input
              id="name"
              name="name"
              defaultValue={agency.name}
              disabled={!canEdit}
              required
            />
          </div>

          <div className="mb-4">
            <Label htmlFor="logoUrl">Logo (URL)</Label>
            <Input
              id="logoUrl"
              name="logoUrl"
              type="url"
              placeholder="https://…"
              defaultValue={agency.logoUrl}
              disabled={!canEdit}
            />
            <p className="mt-1 text-xs text-[var(--color-muted)]">
              L&apos;upload de fichiers arrive avec l&apos;issue #12.
            </p>
          </div>

          <div className="mb-4">
            <Label htmlFor="accentColor">Couleur d&apos;accent</Label>
            <input
              id="accentColor"
              name="accentColor"
              type="color"
              defaultValue={agency.accentColor}
              disabled={!canEdit}
              className="h-9 w-16 cursor-pointer rounded-lg border border-[var(--color-line)] bg-white p-1"
            />
          </div>

          <p className="mb-4 text-xs text-[var(--color-muted)]">
            Identifiant d&apos;espace : <code>{agency.slug}</code>
          </p>

          {state.error && (
            <p className="mb-2 text-sm text-red-600">{state.error}</p>
          )}

          <Button
            type="submit"
            disabled={!canEdit || pending}
            title={
              canEdit
                ? undefined
                : "Réservé aux propriétaires et directeurs de projet"
            }
          >
            {pending ? "Enregistrement…" : "Enregistrer"}
          </Button>
          {!canEdit && (
            <p className="mt-2 text-xs text-[var(--color-muted)]">
              Lecture seule : seuls un propriétaire ou un directeur de projet
              peuvent modifier l&apos;identité de l&apos;agence.
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
