"use client";

import { useActionState, useState, useTransition } from "react";
import {
  regeneratePortalLink,
  revokePortalLink,
  sendPortalLink,
  type SendLinkState,
} from "@/app/actions/project";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type PortalContact = {
  /** Identifiant du rattachement ClientProject, seul accepte par l'action. */
  id: string;
  email: string;
  name: string | null;
  /** Dernier envoi du lien a ce contact, deja formate. */
  sentAt: string | null;
};

type Props = {
  projectId: string;
  hasActiveLink: boolean;
  /** Chemin du lien actif (`/p/<token>`), complete par l'origine cote client. */
  activeUrl: string | null;
  lastUsedAt: string | null;
  contacts: PortalContact[];
  /** Message par defaut, deja aux couleurs de l'agence. */
  defaultMessage: string;
};

const initialSend: SendLinkState = {};

export function PortalPanel({
  projectId,
  hasActiveLink,
  activeUrl,
  lastUsedAt,
  contacts,
  defaultMessage,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [sendState, sendAction, sending] = useActionState(
    sendPortalLink,
    initialSend,
  );
  const [compose, setCompose] = useState(false);
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

            <div className="mt-4 border-t border-[var(--color-line)] pt-4">
              {contacts.length === 0 ? (
                <p className="text-xs text-[var(--color-muted)]">
                  Ajoutez un contact au projet pour lui envoyer le lien
                  directement depuis Onbo.
                </p>
              ) : !compose ? (
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    size="sm"
                    variant="accent"
                    onClick={() => setCompose(true)}
                  >
                    Envoyer le lien
                  </Button>
                  {sendState.sent ? (
                    <span className="text-xs text-[var(--color-muted)]">
                      Envoyé à {sendState.sent} contact
                      {sendState.sent > 1 ? "s" : ""}.
                    </span>
                  ) : null}
                </div>
              ) : (
                <form action={sendAction} className="space-y-3">
                  <input type="hidden" name="projectId" value={projectId} />

                  <fieldset className="space-y-1.5">
                    <legend className="text-xs font-medium">
                      Destinataires
                    </legend>
                    {contacts.map((contact) => (
                      <label
                        key={contact.id}
                        className="flex items-start gap-2 text-xs"
                      >
                        <input
                          type="checkbox"
                          name="clientProjectId"
                          value={contact.id}
                          defaultChecked
                          className="mt-0.5"
                        />
                        <span>
                          {contact.name
                            ? `${contact.name} — ${contact.email}`
                            : contact.email}
                          <span className="block text-[var(--color-muted)]">
                            {contact.sentAt
                              ? `Lien envoyé le ${contact.sentAt}`
                              : "Lien jamais envoyé"}
                          </span>
                        </span>
                      </label>
                    ))}
                  </fieldset>

                  <div>
                    <label
                      htmlFor="portal-message"
                      className="text-xs font-medium"
                    >
                      Message
                    </label>
                    <textarea
                      id="portal-message"
                      name="message"
                      rows={5}
                      defaultValue={defaultMessage}
                      className="mt-1 w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] p-2 text-xs leading-relaxed"
                    />
                    <p className="mt-1 text-xs text-[var(--color-muted)]">
                      Le lien et vos couleurs sont ajoutés automatiquement.
                    </p>
                  </div>

                  {sendState.error && (
                    <p className="text-xs text-[var(--color-danger)]">
                      {sendState.error}
                    </p>
                  )}

                  <div className="flex gap-2">
                    <Button
                      type="submit"
                      size="sm"
                      variant="accent"
                      disabled={sending}
                    >
                      {sending ? "Envoi…" : "Envoyer"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setCompose(false)}
                    >
                      Annuler
                    </Button>
                  </div>
                </form>
              )}
            </div>
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
