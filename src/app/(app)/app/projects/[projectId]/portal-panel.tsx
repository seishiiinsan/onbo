"use client";

import { useState, useTransition } from "react";
import { regeneratePortalLink, revokePortalLink } from "@/app/actions/project";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  projectId: string;
  /**
   * Un lien est actif, mais son URL n'est pas connue du serveur : seul le hash
   * du token est stocke. L'URL n'est affichable qu'a la generation.
   */
  hasActiveLink: boolean;
  lastUsedAt: string | null;
};

export function PortalPanel({ projectId, hasActiveLink, lastUsedAt }: Props) {
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);
  const [freshUrl, setFreshUrl] = useState<string | null>(null);

  const url = freshUrl;

  const copy = async () => {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="self-start">
      <CardHeader>
        <CardTitle>Lien du portail client</CardTitle>
      </CardHeader>
      <CardContent>
        {url ? (
          <>
            <p className="mb-2 break-all rounded-lg bg-[var(--color-canvas)] p-2 text-xs">
              {url}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={copy}>
                {copied ? "Copié" : "Copier"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    const token = await regeneratePortalLink(projectId);
                    setFreshUrl(`${window.location.origin}/p/${token}`);
                  })
                }
              >
                Régénérer
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    await revokePortalLink(projectId);
                    setFreshUrl(null);
                  })
                }
              >
                Révoquer
              </Button>
            </div>
            <p className="mt-2 text-xs text-[var(--color-muted)]">
              {lastUsedAt
                ? `Dernier accès client : ${lastUsedAt}`
                : "Jamais ouvert par le client."}
            </p>
            <p className="mt-1 text-xs text-[var(--color-muted)]">
              Régénérer invalide l&apos;ancien lien.
            </p>
          </>
        ) : (
          <>
            <p className="mb-3 text-sm text-[var(--color-muted)]">
              {hasActiveLink
                ? "Un lien est actif. Pour des raisons de sécurité il n'est affiché qu'à sa création : régénérez-en un si vous l'avez perdu (l'ancien sera invalidé)."
                : "Aucun lien actif. Générez-en un et envoyez-le à votre client."}
            </p>
            <Button
              size="sm"
              variant="accent"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const token = await regeneratePortalLink(projectId);
                  setFreshUrl(`${window.location.origin}/p/${token}`);
                })
              }
            >
              {pending
                ? "Génération…"
                : hasActiveLink
                  ? "Régénérer le lien"
                  : "Générer le lien"}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
