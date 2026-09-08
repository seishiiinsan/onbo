"use client";

import { useActionState, useRef, useTransition } from "react";
import {
  attachClient,
  detachClient,
  type FormState,
} from "@/app/actions/project";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const initial: FormState = {};

type Link = {
  id: string;
  email: string;
  name: string | null;
  company: string | null;
};

export function ClientsPanel({
  projectId,
  links,
}: {
  projectId: string;
  links: Link[];
}) {
  const [state, action, pending] = useActionState(attachClient, initial);
  const [removing, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <Card className="self-start">
      <CardHeader>
        <CardTitle>Contacts</CardTitle>
      </CardHeader>
      <CardContent>
        {links.length === 0 ? (
          <p className="mb-4 text-sm text-[var(--color-muted)]">
            Aucun contact rattaché.
          </p>
        ) : (
          <ul className="mb-4 space-y-2">
            {links.map((link) => (
              <li
                key={link.id}
                className="flex items-start justify-between gap-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {link.name || link.email}
                  </p>
                  <p className="truncate text-xs text-[var(--color-muted)]">
                    {link.company ? `${link.company} · ` : ""}
                    {link.email}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={removing}
                  onClick={() =>
                    startTransition(() => {
                      void detachClient(link.id);
                    })
                  }
                >
                  Retirer
                </Button>
              </li>
            ))}
          </ul>
        )}

        <form
          ref={formRef}
          action={async (formData) => {
            action(formData);
            formRef.current?.reset();
          }}
          className="space-y-2 border-t border-[var(--color-line)] pt-4"
        >
          <input type="hidden" name="projectId" value={projectId} />
          <Input
            name="email"
            type="email"
            placeholder="Email du client"
            required
          />
          <Input name="name" placeholder="Nom (option)" />
          <Input name="company" placeholder="Société (option)" />
          {state.error && <p className="text-sm text-red-600">{state.error}</p>}
          <Button type="submit" size="sm" disabled={pending} className="w-full">
            {pending ? "Ajout…" : "Ajouter un contact"}
          </Button>
          <p className="text-xs text-[var(--color-muted)]">
            Transmettez-leur le lien du portail ci-dessus.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
