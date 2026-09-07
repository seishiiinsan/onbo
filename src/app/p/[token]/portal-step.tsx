"use client";

import { useActionState, useState, useTransition } from "react";
import type { CommentAuthor, StepKind, StepStatus } from "@prisma/client";
import {
  clientAddComment,
  clientAddCredential,
  clientSetStepStatus,
  type PortalFormState,
} from "@/app/actions/portal";
import { CREDENTIAL_KIND_LABEL } from "@/components/credential-kind";
import { formatSize, Uploader } from "@/components/uploader";
import { StepBadge, Tag } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { KIND_LABEL } from "@/lib/progress";

const initial: PortalFormState = {};

type Step = {
  id: string;
  title: string;
  description: string | null;
  kind: StepKind;
  status: StepStatus;
  assets: { id: string; filename: string; size: number }[];
  credentials: { id: string; label: string }[];
  comments: {
    id: string;
    body: string;
    author: CommentAuthor;
    at: string;
  }[];
};

export function PortalStep({
  token,
  agencyName,
  step,
}: {
  token: string;
  agencyName: string;
  step: Step;
}) {
  const [open, setOpen] = useState(step.status !== "VALIDATED");
  const [pending, startTransition] = useTransition();
  const locked = step.status === "VALIDATED";

  const move = (status: "IN_PROGRESS" | "SUBMITTED") =>
    startTransition(() => {
      void clientSetStepStatus(token, step.id, status);
    });

  return (
    <li className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface)]">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-start justify-between gap-3 p-5 text-left"
      >
        <span className="min-w-0">
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
        </span>
        <span className="shrink-0 text-xs text-[var(--color-muted)]">
          {open ? "réduire" : "ouvrir"}
        </span>
      </button>

      {open && (
        <div className="space-y-6 border-t border-[var(--color-line)] p-5">
          {locked ? (
            <p className="text-sm text-[var(--color-validated)]">
              {agencyName} a validé cette étape. Rien de plus à faire.
            </p>
          ) : (
            <>
              <Files token={token} step={step} />
              <Credentials token={token} step={step} />
            </>
          )}

          <Messages token={token} step={step} agencyName={agencyName} />

          {!locked && (
            <div className="flex flex-wrap items-center gap-2 border-t border-[var(--color-line)] pt-4">
              {step.status === "SUBMITTED" ? (
                <>
                  <p className="flex-1 text-sm text-[var(--color-muted)]">
                    Transmis à {agencyName}, en attente de validation.
                  </p>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={pending}
                    onClick={() => move("IN_PROGRESS")}
                  >
                    J&apos;ai un ajout à faire
                  </Button>
                </>
              ) : (
                <>
                  {step.status === "PENDING" && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={pending}
                      onClick={() => move("IN_PROGRESS")}
                    >
                      Je m&apos;en occupe
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="accent"
                    disabled={pending}
                    onClick={() => move("SUBMITTED")}
                  >
                    C&apos;est complet
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </li>
  );
}

function Files({ token, step }: { token: string; step: Step }) {
  return (
    <section>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
        Vos fichiers
      </h3>
      {step.assets.length > 0 && (
        <ul className="mb-3 space-y-1.5">
          {step.assets.map((asset) => (
            <li
              key={asset.id}
              className="flex items-center justify-between gap-2 rounded-lg bg-[var(--color-canvas)] px-3 py-2 text-sm"
            >
              <a
                href={`/api/files/${asset.id}?token=${token}`}
                className="min-w-0 flex-1 truncate hover:underline"
              >
                {asset.filename}
              </a>
              <span className="shrink-0 text-xs text-[var(--color-muted)]">
                {formatSize(asset.size)}
              </span>
            </li>
          ))}
        </ul>
      )}
      <Uploader stepId={step.id} token={token} label="Déposer un fichier" />
    </section>
  );
}

function Credentials({ token, step }: { token: string; step: Step }) {
  const [state, action, pending] = useActionState(clientAddCredential, initial);
  const [adding, setAdding] = useState(false);

  return (
    <section>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
        Vos accès
      </h3>

      {step.credentials.length > 0 && (
        <ul className="mb-3 space-y-1.5">
          {step.credentials.map((credential) => (
            <li
              key={credential.id}
              className="flex items-center gap-2 rounded-lg bg-[var(--color-canvas)] px-3 py-2 text-sm"
            >
              <span className="flex-1 truncate">{credential.label}</span>
              <span className="text-xs text-[var(--color-muted)]">
                transmis · chiffré
              </span>
            </li>
          ))}
        </ul>
      )}

      {adding ? (
        <form action={action} className="space-y-2">
          <input type="hidden" name="token" value={token} />
          <input type="hidden" name="stepId" value={step.id} />
          <Input name="label" placeholder="De quel accès s'agit-il ?" required />
          <Select name="kind" defaultValue="OTHER">
            {Object.entries(CREDENTIAL_KIND_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
          <Input name="url" placeholder="Adresse de connexion (option)" />
          <Input name="username" placeholder="Identifiant" />
          <Input
            name="secret"
            type="password"
            placeholder="Mot de passe ou clé"
            required
          />
          {state.error && (
            <p className="text-sm text-[var(--color-danger)]">{state.error}</p>
          )}
          <div className="flex gap-2">
            <Button type="submit" size="sm" variant="accent" disabled={pending}>
              Transmettre en sécurité
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
        <>
          <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
            Transmettre un accès
          </Button>
          <p className="mt-1.5 text-xs text-[var(--color-muted)]">
            Chiffré à la réception. Ni visible ici ensuite, ni transmis par
            email.
          </p>
        </>
      )}
    </section>
  );
}

function Messages({
  token,
  step,
  agencyName,
}: {
  token: string;
  step: Step;
  agencyName: string;
}) {
  const [state, action, pending] = useActionState(clientAddComment, initial);

  return (
    <section>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
        Échanges
      </h3>

      {step.comments.length > 0 && (
        <ul className="mb-3 space-y-2">
          {step.comments.map((comment) => (
            <li
              key={comment.id}
              className="rounded-lg bg-[var(--color-canvas)] px-3 py-2 text-sm"
            >
              <p className="mb-0.5 text-[11px] text-[var(--color-muted)]">
                {comment.author === "AGENCY" ? agencyName : "Vous"} ·{" "}
                {comment.at}
              </p>
              <p className="whitespace-pre-wrap">{comment.body}</p>
            </li>
          ))}
        </ul>
      )}

      <form action={action}>
        <input type="hidden" name="token" value={token} />
        <input type="hidden" name="stepId" value={step.id} />
        <Textarea name="body" placeholder="Une question ? Écrivez ici…" required />
        {state.error && (
          <p className="mt-1 text-sm text-[var(--color-danger)]">
            {state.error}
          </p>
        )}
        <Button type="submit" size="sm" className="mt-2" disabled={pending}>
          Envoyer
        </Button>
      </form>
    </section>
  );
}
