"use client";

import { useActionState } from "react";
import { MailCheck } from "lucide-react";
import { requestLoginLink, type LoginState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initial: LoginState = {};

export function LoginForm() {
  const [state, action, pending] = useActionState(requestLoginLink, initial);

  if (state.sent) {
    return (
      <div className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface)] p-5">
        <MailCheck size={22} className="text-[var(--color-validated)]" />
        <p className="mt-3 font-display text-xl">Lien envoyé.</p>
        <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-muted)]">
          Ouvrez votre boîte mail et cliquez sur le lien pour entrer. Il est
          valable 15 minutes.
        </p>
      </div>
    );
  }

  return (
    <form action={action}>
      <Label htmlFor="email">Email professionnel</Label>
      <Input
        id="email"
        name="email"
        type="email"
        autoComplete="email"
        placeholder="vous@agence.fr"
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
        {pending ? "Envoi…" : "Recevoir mon lien de connexion"}
      </Button>

      <p className="mt-4 text-xs leading-relaxed text-[var(--color-muted)]">
        Pas de mot de passe à retenir : nous envoyons un lien à usage unique.
        En continuant, vous acceptez que vos données soient traitées pour la
        fourniture du service.
      </p>
    </form>
  );
}
