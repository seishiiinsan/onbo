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
        <CardContent>
          <p className="font-display text-xl">Lien envoyé.</p>
          <p className="mt-1.5 text-sm text-[var(--color-muted)]">
            Ouvrez votre boîte mail. Le lien est valable 15 minutes.
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
            <p className="mt-2 text-sm text-[var(--color-danger)]">
              {state.error}
            </p>
          )}
          <Button
            type="submit"
            variant="accent"
            className="mt-4 w-full"
            disabled={pending}
          >
            {pending ? "Envoi…" : "Recevoir mon lien"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
