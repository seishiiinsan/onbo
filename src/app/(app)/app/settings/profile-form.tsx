"use client";

import { useActionState } from "react";
import { updateProfile, type AgencyState } from "@/app/actions/agency";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";

const initial: AgencyState = {};

/** Profil de la personne connectee : nom affiche dans le rail et les messages. */
export function ProfileForm({
  name,
  email,
}: {
  name: string;
  email: string;
}) {
  const [state, action, pending] = useActionState(updateProfile, initial);
  const toast = useToast();

  return (
    <Card id="profil">
      <CardHeader>
        <CardTitle>Mon profil</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          action={async (formData) => {
            await action(formData);
            toast({ message: "Profil mis à jour." });
          }}
        >
          <Label htmlFor="profile-name">Nom et prénom</Label>
          <Input
            id="profile-name"
            name="name"
            defaultValue={name}
            placeholder="Camille Dupont"
          />

          <p className="mt-3 text-xs text-[var(--color-muted)]">
            Connexion avec <span className="font-medium">{email}</span>. Cette
            adresse ne peut pas être modifiée : elle identifie votre compte.
          </p>

          {state.error && (
            <p className="mt-2 text-sm text-[var(--color-danger)]">
              {state.error}
            </p>
          )}

          <Button type="submit" className="mt-4" disabled={pending}>
            {pending ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
