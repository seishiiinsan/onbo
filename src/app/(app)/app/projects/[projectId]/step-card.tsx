"use client";

import { useActionState, useState, useTransition } from "react";
import type { CommentAuthor, CredentialKind, StepStatus } from "@prisma/client";
import {
  addAgencyComment,
  addCredential,
  deleteAsset,
  deleteComment,
  deleteCredential,
  revealCredential,
  type FormState,
} from "@/app/actions/collab";
import { deleteStep, setStepStatus } from "@/app/actions/project";
import { CREDENTIAL_KIND_LABEL } from "@/components/credential-kind";
import { formatSize, Uploader } from "@/components/uploader";
import { StepBadge, Tag } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { KIND_LABEL } from "@/lib/progress";
import { cn } from "@/lib/utils";

const initial: FormState = {};

export type StepCardData = {
  id: string;
  title: string;
  description: string | null;
  kind: keyof typeof KIND_LABEL;
  status: StepStatus;
  assets: {
    id: string;
    filename: string;
    size: number;
    uploadedByClient: boolean;
  }[];
  credentials: {
    id: string;
    label: string;
    kind: CredentialKind;
    username: string | null;
    url: string | null;
    lastAccess: string | null;
  }[];
  comments: {
    id: string;
    body: string;
    author: CommentAuthor;
    authorName: string | null;
    internal: boolean;
    at: string;
  }[];
};

export function StepCard({ step }: { step: StepCardData }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const activity =
    step.assets.length + step.credentials.length + step.comments.length;

  return (
    <li className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface)]">
      <div className="flex flex-wrap items-start justify-between gap-3 p-4">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="min-w-0 flex-1 text-left"
        >
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{step.title}</span>
            <Tag>{KIND_LABEL[step.kind]}</Tag>
            <StepBadge status={step.status} />
          </span>
          {step.description && (
            <span className="mt-1 block text-sm text-[var(--color-muted)]">
              {step.description}
            </span>
          )}
          <span className="mt-1.5 block text-xs text-[var(--color-muted)]">
            {activity === 0
              ? "Aucun élément déposé"
              : `${step.assets.length} fichier(s) · ${step.credentials.length} accès · ${step.comments.length} message(s)`}
            {" · "}
            {open ? "réduire" : "ouvrir"}
          </span>
        </button>

        <div className="flex shrink-0 items-center gap-2">
          {step.status === "SUBMITTED" && (
            <Button
              size="sm"
              variant="accent"
              disabled={pending}
              onClick={() =>
                startTransition(() => {
                  void setStepStatus(step.id, "VALIDATED");
                })
              }
            >
              Valider
            </Button>
          )}
          {step.status === "VALIDATED" ? (
            <Button
              size="sm"
              variant="ghost"
              disabled={pending}
              onClick={() =>
                startTransition(() => {
                  void setStepStatus(step.id, "IN_PROGRESS");
                })
              }
            >
              Rouvrir
            </Button>
          ) : (
            <Select
              value={step.status}
              disabled={pending}
              onChange={(event) => {
                const next = event.target.value as StepStatus;
                startTransition(() => {
                  void setStepStatus(step.id, next);
                });
              }}
              className="h-8 w-32 text-xs"
            >
              <option value="PENDING">À faire</option>
              <option value="IN_PROGRESS">En cours</option>
              <option value="SUBMITTED">Soumis</option>
              <option value="VALIDATED">Validé</option>
            </Select>
          )}
        </div>
      </div>

      {open && (
        <div className="grid gap-6 border-t border-[var(--color-line)] p-4 md:grid-cols-2">
          <Files step={step} />
          <Credentials step={step} />
          <div className="md:col-span-2">
            <Comments step={step} />
          </div>
          <div className="md:col-span-2">
            <Button
              size="sm"
              variant="danger"
              disabled={pending}
              onClick={() =>
                startTransition(() => {
                  void deleteStep(step.id);
                })
              }
            >
              Supprimer l&apos;étape
            </Button>
          </div>
        </div>
      )}
    </li>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
      {children}
    </h3>
  );
}

function Files({ step }: { step: StepCardData }) {
  const [pending, startTransition] = useTransition();

  return (
    <section>
      <SectionTitle>Fichiers</SectionTitle>
      {step.assets.length === 0 ? (
        <p className="mb-3 text-sm text-[var(--color-muted)]">
          Aucun fichier déposé.
        </p>
      ) : (
        <ul className="mb-3 space-y-1.5">
          {step.assets.map((asset) => (
            <li
              key={asset.id}
              className="flex items-center justify-between gap-2 rounded-lg bg-[var(--color-canvas)] px-3 py-2"
            >
              <a
                href={`/api/files/${asset.id}`}
                className="min-w-0 flex-1 truncate text-sm hover:underline"
              >
                {asset.filename}
              </a>
              <span className="shrink-0 text-xs text-[var(--color-muted)]">
                {formatSize(asset.size)}
                {asset.uploadedByClient ? " · client" : ""}
              </span>
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  startTransition(() => {
                    void deleteAsset(asset.id);
                  })
                }
                className="shrink-0 text-xs text-[var(--color-muted)] hover:text-[var(--color-danger)]"
              >
                Suppr.
              </button>
            </li>
          ))}
        </ul>
      )}
      <Uploader stepId={step.id} />
    </section>
  );
}

function Credentials({ step }: { step: StepCardData }) {
  const [state, action, pending] = useActionState(addCredential, initial);
  const [adding, setAdding] = useState(false);

  return (
    <section>
      <SectionTitle>Accès</SectionTitle>

      {step.credentials.length === 0 ? (
        <p className="mb-3 text-sm text-[var(--color-muted)]">
          Aucun accès transmis.
        </p>
      ) : (
        <ul className="mb-3 space-y-1.5">
          {step.credentials.map((credential) => (
            <CredentialRow key={credential.id} credential={credential} />
          ))}
        </ul>
      )}

      {adding ? (
        <form action={action} className="space-y-2">
          <input type="hidden" name="stepId" value={step.id} />
          <Input name="label" placeholder="Libellé (ex : OVH)" required />
          <Select name="kind" defaultValue="OTHER" className="h-9 text-sm">
            {Object.entries(CREDENTIAL_KIND_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
          <Input name="username" placeholder="Identifiant (option)" />
          <Input name="secret" type="password" placeholder="Mot de passe / clé" required />
          {state.error && (
            <p className="text-sm text-[var(--color-danger)]">{state.error}</p>
          )}
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={pending}>
              Enregistrer
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setAdding(false)}
            >
              Annuler
            </Button>
          </div>
        </form>
      ) : (
        <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
          Ajouter un accès
        </Button>
      )}
    </section>
  );
}

function CredentialRow({
  credential,
}: {
  credential: StepCardData["credentials"][number];
}) {
  const [secret, setSecret] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <li className="rounded-lg bg-[var(--color-canvas)] px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{credential.label}</p>
          <p className="truncate text-xs text-[var(--color-muted)]">
            {CREDENTIAL_KIND_LABEL[credential.kind]}
            {credential.username ? ` · ${credential.username}` : ""}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                if (secret) {
                  setSecret(null);
                  return;
                }
                setSecret(await revealCredential(credential.id));
              })
            }
          >
            {secret ? "Masquer" : "Révéler"}
          </Button>
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(() => {
                void deleteCredential(credential.id);
              })
            }
            className="text-xs text-[var(--color-muted)] hover:text-[var(--color-danger)]"
          >
            Suppr.
          </button>
        </div>
      </div>

      {secret && (
        <p className="mt-2 rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-2 py-1.5 font-mono text-xs break-all">
          {secret}
        </p>
      )}
      {credential.lastAccess && (
        <p className="mt-1 text-[11px] text-[var(--color-muted)]">
          Dernière révélation : {credential.lastAccess}
        </p>
      )}
    </li>
  );
}

function Comments({ step }: { step: StepCardData }) {
  const [state, action, pending] = useActionState(addAgencyComment, initial);
  const [removing, startTransition] = useTransition();

  return (
    <section>
      <SectionTitle>Échanges</SectionTitle>

      {step.comments.length > 0 && (
        <ul className="mb-3 space-y-2">
          {step.comments.map((comment) => (
            <li
              key={comment.id}
              className={cn(
                "rounded-lg px-3 py-2 text-sm",
                comment.internal
                  ? "border border-dashed border-[var(--color-line-strong)] bg-transparent"
                  : comment.author === "CLIENT"
                    ? "bg-[var(--color-submitted-soft)]"
                    : "bg-[var(--color-canvas)]",
              )}
            >
              <div className="mb-0.5 flex items-center justify-between gap-2 text-[11px] text-[var(--color-muted)]">
                <span>
                  {comment.author === "CLIENT"
                    ? "Client"
                    : (comment.authorName ?? "Agence")}
                  {comment.internal && " · note interne"} · {comment.at}
                </span>
                <button
                  type="button"
                  disabled={removing}
                  onClick={() =>
                    startTransition(() => {
                      void deleteComment(comment.id);
                    })
                  }
                  className="hover:text-[var(--color-danger)]"
                >
                  Suppr.
                </button>
              </div>
              <p className="whitespace-pre-wrap">{comment.body}</p>
            </li>
          ))}
        </ul>
      )}

      <form action={action}>
        <input type="hidden" name="stepId" value={step.id} />
        <Textarea name="body" placeholder="Écrire au client…" required />
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <Button type="submit" size="sm" disabled={pending}>
            Envoyer
          </Button>
          <label className="flex items-center gap-1.5 text-xs text-[var(--color-muted)]">
            <input type="checkbox" name="internal" />
            Note interne (invisible du client)
          </label>
        </div>
        {state.error && (
          <p className="mt-1 text-sm text-[var(--color-danger)]">{state.error}</p>
        )}
      </form>
    </section>
  );
}
