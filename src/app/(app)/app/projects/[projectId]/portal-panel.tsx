"use client";

import { useState, useTransition } from "react";
import { regeneratePortalLink, revokePortalLink } from "@/app/actions/project";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  projectId: string;
  hasActiveLink: boolean;
  /** Chemin du lien actif (`/p/<token>`), complete par l'origine cote client. */
  activeUrl: string | null;
  lastUsedAt: string | null;
};

export function PortalPanel({
  projectId,
  hasActiveLink,
  activeUrl,
  lastUsedAt,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);
  const [path, setPath] = useState<string | null>(activeUrl);

  const url =
    path && typeof window !== "undefined"
      ? `${window.location.origin}${path}`
      : path;

  /**
   * navigator.clipboard n'existe qu'en contexte securise (HTTPS ou localhost).
   * Sur une IP en HTTP, on retombe sur une selection + execCommand.
   */
  const copy = async () => {
    if (!url) return;

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url);
      } else {
        const field = document.createElement("textarea");
        field.value = url;
        field.style.position = "fixed";
        field.style.opacity = "0";
        document.body.appendChild(field);
        field.select();
        document.execCommand("copy");
        document.body.removeChild(field);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Card className="self-start">
      <CardHeader>
        <CardTitle>Portail client</CardTitle>
      </CardHeader>
      <CardContent>
        {url ? (
          <>
            <p className="mb-2.5 break-all rounded-lg bg-[var(--color-canvas)] p-2.5 text-xs leading-relaxed">
              {url}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="accent" onClick={copy}>
                {copied ? "Copié" : "Copier le lien"}
              </Button>
              <a href={path ?? "#"} target="_blank" rel="noreferrer">
                <Button size="sm" variant="outline">
                  Ouvrir
                </Button>
              </a>
            </div>
            <div className="mt-3 flex flex-wrap gap-3 text-xs">
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    const token = await regeneratePortalLink(projectId);
                    setPath(`/p/${token}`);
                  })
                }
                className="text-[var(--color-muted)] underline-offset-2 hover:underline"
              >
                Régénérer
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    await revokePortalLink(projectId);
                    setPath(null);
                  })
                }
                className="text-[var(--color-muted)] underline-offset-2 hover:underline hover:text-[var(--color-danger)]"
              >
                Révoquer
              </button>
            </div>
            <p className="mt-2 text-xs text-[var(--color-muted)]">
              {lastUsedAt
                ? `Dernier accès client : ${lastUsedAt}`
                : "Jamais ouvert par le client."}
            </p>
          </>
        ) : (
          <>
            <p className="mb-3 text-sm text-[var(--color-muted)]">
              {hasActiveLink
                ? "Lien révoqué. Générez-en un nouveau pour redonner l'accès."
                : "Générez le lien à envoyer à votre client. Aucun compte ne lui sera demandé."}
            </p>
            <Button
              size="sm"
              variant="accent"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const token = await regeneratePortalLink(projectId);
                  setPath(`/p/${token}`);
                })
              }
            >
              {pending ? "Génération…" : "Générer le lien"}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
