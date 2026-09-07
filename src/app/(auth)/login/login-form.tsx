"use client";

import { useActionState } from "react";
import { requestLoginLink, type LoginState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initial: LoginState = {};

export function LoginForm() {
  const [state, action, pending] = useActionState(requestLoginLink, initial);

  if (state.sent) {
    return (
      <Card>
        <CardContent className="text-sm">
          <p className="font-medium">Lien envoyé.</p>
          <p className="mt-1 text-[var(--color-muted)]">
            Vérifiez votre boîte mail. Le lien est valable 15 minutes.
          </p>
          <p className="mt-3 text-xs text-[var(--color-muted)]">
            En développement, le lien s&apos;affiche dans les logs du serveur.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <form action={action}>
          <Label htmlFor="email">Email professionnel</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="vous@agence.fr"
            required
          />
          {state.error && (
            <p className="mt-2 text-sm text-red-600">{state.error}</p>
          )}
          <Button
            type="submit"
            variant="accent"
            className="mt-4 w-full"
            disabled={pending}
          >
            {pending ? "Envoi…" : "Recevoir un lien de connexion"}
          </Button>
          <p className="mt-3 text-xs text-[var(--color-muted)]">
            Pas de mot de passe : un lien à usage unique par email.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
