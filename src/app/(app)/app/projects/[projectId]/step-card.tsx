"use client";

import { useActionState, useOptimistic, useState, useTransition } from "react";
import type {
  CommentAuthor,
  CredentialKind,
  StepKind,
  StepStatus,
} from "@prisma/client";
import {
  Copy,
  Download,
  Eye,
  EyeOff,
  Pencil,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import {
  addAgencyComment,
  addCredential,
  deleteAsset,
  deleteComment,
  deleteCredential,
  revealCredential,
  type FormState,
} from "@/app/actions/collab";
import {
  deleteStep,
  setStepBlocked,
  setStepStatus,
  updateStep,
} from "@/app/actions/project";
import { CREDENTIAL_KIND_LABEL } from "@/components/credential-kind";
import { StepIcon } from "@/components/step-icon";
import { AssetThumb, formatSize, Uploader } from "@/components/uploader";
import { StepBadge, Tag } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm";
import { Input, Select, Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { copyWithExpiry } from "@/lib/clipboard";
import { useDraft } from "@/lib/use-draft";
import { KIND_LABEL } from "@/lib/progress";
import { cn } from "@/lib/utils";

const initial: FormState = {};

export type StepCardData = {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  kind: StepKind;
  status: StepStatus;
  required: boolean;
  blockedNote: string | null;
  canEdit: boolean;
  canViewCredentials: boolean;
  assets: {
    id: string;
    filename: string;
    mimeType: string;
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
    accessCount: number;
    ageDays: number;
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

export function StepCard({
  step,
  open,
  onToggle,
  handle,
  dragHandlers,
}: {
  step: StepCardData;
  open: boolean;
  onToggle: () => void;
  /** Poignee de deplacement, fournie par la liste (item 16). */
  handle?: React.ReactNode;
  dragHandlers?: React.LiHTMLAttributes<HTMLLIElement>;
}) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);

  // Item 37 : le statut bascule immediatement, le serveur suit.
  const [status, setStatus] = useOptimistic(step.status);

  const change = (next: StepStatus) =>
    startTransition(async () => {
      setStatus(next);
      await setStepStatus(step.id, next);
      toast({
        message: next === "VALIDATED" ? "Étape validée." : "Statut mis à jour.",
      });
    });

  return (
    <li
      {...dragHandlers}
      className={cn(
        "rounded-[var(--radius-card)] border bg-[var(--color-surface)] transition-shadow",
        step.blockedNote
          ? "border-[var(--color-progress)]/40"
          : "border-[var(--color-line)]",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 p-4">
        {handle}
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className="focusable min-w-0 flex-1 self-stretch rounded-lg text-left"
        >
          <span className="flex flex-wrap items-center gap-2">
            <StepIcon kind={step.kind} />
            <span className="font-medium">{step.title}</span>
            {!step.required && <Tag>Optionnelle</Tag>}
            <Tag>{KIND_LABEL[step.kind]}</Tag>
            <StepBadge status={status} />
          </span>

          {step.description && (
            <span className="mt-1 block text-sm text-[var(--color-muted)]">
              {step.description}
            </span>
          )}

          <span className="mt-1.5 block text-xs text-[var(--color-muted)]">
            {step.assets.length} fichier(s) · {step.credentials.length} accès ·{" "}
            {step.comments.length} message(s)
          </span>
        </button>

        <div className="flex shrink-0 items-center gap-2">
          {step.canEdit && status === "SUBMITTED" && (
            <Button
              size="sm"
              variant="accent"
              disabled={pending}
              onClick={() => change("VALIDATED")}
            >
              Valider
            </Button>
          )}

          {!step.canEdit ? null : status === "VALIDATED" ? (
            <Button
              size="sm"
              variant="ghost"
              disabled={pending}
              onClick={() => change("IN_PROGRESS")}
            >
              Rouvrir
            </Button>
          ) : (
            <Select
              value={status}
              disabled={pending}
              aria-label="Statut de l'étape"
              onChange={(event) => change(event.target.value as StepStatus)}
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

      {step.blockedNote && (
        <p className="flex items-start gap-2 border-t border-[var(--color-line)] bg-[var(--color-progress-soft)] px-4 py-2.5 text-sm text-[var(--color-progress)]">
          <TriangleAlert size={15} className="mt-0.5 shrink-0" />
          <span>
            Bloqué : {step.blockedNote}
            <span className="block text-xs opacity-80">
              Ce motif est visible par le client.
            </span>
          </span>
        </p>
      )}

      {open && (
        <div className="grid gap-6 border-t border-[var(--color-line)] p-4 md:grid-cols-2">
          {editing ? (
            <div className="md:col-span-2">
              <EditForm step={step} onDone={() => setEditing(false)} />
            </div>
          ) : null}

          <Files step={step} />

          {step.canViewCredentials ? (
            <Credentials step={step} />
          ) : (
            <section>
              <SectionTitle>Accès</SectionTitle>
              <p className="text-sm text-[var(--color-muted)]">
                {step.credentials.length} accès transmis, réservés aux personnes
                habilitées sur ce projet.
              </p>
            </section>
          )}

          <div className="md:col-span-2">
            <Comments step={step} />
          </div>

          {step.canEdit && (
            <div className="flex flex-wrap gap-2 md:col-span-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setEditing((value) => !value)}
              >
                <Pencil size={14} />
                Modifier
              </Button>

              <BlockButton step={step} />

              <Button
                size="sm"
                variant="danger"
                onClick={() => setConfirming(true)}
              >
                <Trash2 size={14} />
                Supprimer
              </Button>
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        open={confirming}
        title="Supprimer cette étape ?"
        body="Les fichiers, accès et messages qu'elle contient seront supprimés avec elle."
        onCancel={() => setConfirming(false)}
        onConfirm={() => {
          setConfirming(false);
          startTransition(async () => {
            await deleteStep(step.id);
            toast({ message: "Étape supprimée." });
          });
        }}
      />
    </li>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="section-label mb-2">{children}</h3>;
}

function EditForm({
  step,
  onDone,
}: {
  step: StepCardData;
  onDone: () => void;
}) {
  const [state, action, pending] = useActionState(updateStep, initial);
  const toast = useToast();

  return (
    <form
      action={async (formData) => {
        await action(formData);
        toast({ message: "Étape mise à jour." });
        onDone();
      }}
      className="space-y-2 rounded-xl border border-[var(--color-line)] p-3"
    >
      <input type="hidden" name="stepId" value={step.id} />
      <Input name="title" defaultValue={step.title} required />
      <Input
        name="description"
        defaultValue={step.description ?? ""}
        placeholder="Description"
      />
      <Select name="kind" defaultValue={step.kind}>
        {Object.entries(KIND_LABEL).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </Select>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="required" defaultChecked={step.required} />
        Étape obligatoire (compte dans l&apos;avancement)
      </label>
      {state.error && (
        <p className="text-sm text-[var(--color-danger)]">{state.error}</p>
      )}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          Enregistrer
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onDone}>
          Annuler
        </Button>
      </div>
    </form>
  );
}

function BlockButton({ step }: { step: StepCardData }) {
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState(step.blockedNote ?? "");
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  if (!editing) {
    return (
      <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
        <TriangleAlert size={14} />
        {step.blockedNote ? "Modifier le blocage" : "Signaler un blocage"}
      </Button>
    );
  }

  return (
    <div className="w-full space-y-2 rounded-xl border border-[var(--color-line)] p-3">
      <Input
        value={note}
        onChange={(event) => setNote(event.target.value)}
        placeholder="Ce qui bloque, en une phrase"
        autoFocus
      />
      <div className="flex gap-2">
        <Button
          size="sm"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await setStepBlocked(step.id, note);
              toast({ message: note ? "Blocage signalé." : "Blocage levé." });
              setEditing(false);
            })
          }
        >
          Enregistrer
        </Button>
        {step.blockedNote && (
          <Button
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await setStepBlocked(step.id, "");
                setNote("");
                toast({ message: "Blocage levé." });
                setEditing(false);
              })
            }
          >
            Lever le blocage
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
          Annuler
        </Button>
      </div>
    </div>
  );
}

function Files({ step }: { step: StepCardData }) {
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <SectionTitle>Fichiers</SectionTitle>
        {step.assets.length > 1 && (
          <a
            href={`/api/steps/${step.id}/archive`}
            className="focusable flex items-center gap-1 rounded text-xs text-[var(--color-muted)] hover:text-[var(--color-ink)]"
          >
            <Download size={13} />
            Tout télécharger
          </a>
        )}
      </div>

      {step.assets.length === 0 ? (
        <p className="mb-3 text-sm text-[var(--color-muted)]">
          Aucun fichier déposé.
        </p>
      ) : (
        <ul className="mb-3 space-y-1.5">
          {step.assets.map((asset) => (
            <li
              key={asset.id}
              className="flex items-center gap-2.5 rounded-lg bg-[var(--color-canvas)] px-2.5 py-2"
            >
              <AssetThumb asset={asset} />
              <a
                href={`/api/files/${asset.id}`}
                className="focusable min-w-0 flex-1 truncate rounded text-sm hover:underline"
              >
                {asset.filename}
              </a>
              <span className="shrink-0 text-xs text-[var(--color-muted)]">
                {formatSize(asset.size)}
                {asset.uploadedByClient ? " · client" : ""}
              </span>
              {step.canEdit && (
                <button
                  type="button"
                  aria-label={`Supprimer ${asset.filename}`}
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      await deleteAsset(asset.id);
                      toast({ message: "Fichier supprimé." });
                    })
                  }
                  className="focusable shrink-0 rounded text-[var(--color-muted)] hover:text-[var(--color-danger)]"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {step.canEdit && <Uploader stepId={step.id} />}
    </section>
  );
}

function Credentials({ step }: { step: StepCardData }) {
  const [state, action, pending] = useActionState(addCredential, initial);
  const [adding, setAdding] = useState(false);
  const toast = useToast();

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
            <CredentialRow
              key={credential.id}
              credential={credential}
              canEdit={step.canEdit}
            />
          ))}
        </ul>
      )}

      {step.canEdit &&
        (adding ? (
          <form
            action={async (formData) => {
              await action(formData);
              toast({ message: "Accès enregistré, chiffré." });
              setAdding(false);
            }}
            className="space-y-2"
          >
            <input type="hidden" name="stepId" value={step.id} />
            <Input name="label" placeholder="Libellé (ex : OVH)" required />
            <Select name="kind" defaultValue="OTHER">
              {Object.entries(CREDENTIAL_KIND_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
            <Input name="username" placeholder="Identifiant (option)" />
            <Input
              name="secret"
              type="password"
              placeholder="Mot de passe / clé"
              required
            />
            {state.error && (
              <p className="text-sm text-[var(--color-danger)]">
                {state.error}
              </p>
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
        ))}
    </section>
  );
}

function CredentialRow({
  credential,
  canEdit,
}: {
  credential: StepCardData["credentials"][number];
  canEdit: boolean;
}) {
  const [secret, setSecret] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const toast = useToast();

  // Item 44 : un acces jamais consulte depuis longtemps merite une verification.
  const stale = credential.accessCount === 0 && credential.ageDays > 180;

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
          <button
            type="button"
            aria-label={secret ? "Masquer le secret" : "Révéler le secret"}
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
            className="focusable rounded p-1 text-[var(--color-muted)] hover:text-[var(--color-ink)]"
          >
            {secret ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>

          <button
            type="button"
            aria-label="Copier le secret"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const value = secret ?? (await revealCredential(credential.id));
                await copyWithExpiry(value);
                toast({
                  message: "Copié. Le presse-papier sera vidé dans 30 s.",
                });
              })
            }
            className="focusable rounded p-1 text-[var(--color-muted)] hover:text-[var(--color-ink)]"
          >
            <Copy size={15} />
          </button>

          {canEdit && (
            <button
              type="button"
              aria-label="Supprimer cet accès"
              disabled={pending}
              onClick={() => setConfirming(true)}
              className="focusable rounded p-1 text-[var(--color-muted)] hover:text-[var(--color-danger)]"
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </div>

      {secret && (
        <p className="mt-2 break-all rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-2 py-1.5 font-mono text-xs">
          {secret}
        </p>
      )}

      <p className="mt-1 text-[11px] text-[var(--color-muted)]">
        {credential.accessCount === 0
          ? "Jamais consulté"
          : `${credential.accessCount} consultation(s) · dernière : ${credential.lastAccess}`}
      </p>

      {stale && (
        <p className="mt-1 text-[11px] text-[var(--color-progress)]">
          Déposé il y a plus de 6 mois sans jamais servir — toujours valable ?
        </p>
      )}

      <ConfirmDialog
        open={confirming}
        title="Supprimer cet accès ?"
        body="Le secret chiffré sera définitivement effacé."
        onCancel={() => setConfirming(false)}
        onConfirm={() => {
          setConfirming(false);
          startTransition(async () => {
            await deleteCredential(credential.id);
            toast({ message: "Accès supprimé." });
          });
        }}
      />
    </li>
  );
}

function Comments({ step }: { step: StepCardData }) {
  const [state, action, pending] = useActionState(addAgencyComment, initial);
  const [removing, startTransition] = useTransition();
  const toast = useToast();

  // Item 26 : le brouillon survit a un rechargement.
  const draft = useDraft(`comment:${step.id}`);

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
                  ? "border border-dashed border-[var(--color-line-strong)]"
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
                {step.canEdit && (
                  <button
                    type="button"
                    disabled={removing}
                    onClick={() =>
                      startTransition(async () => {
                        await deleteComment(comment.id);
                        toast({ message: "Message supprimé." });
                      })
                    }
                    className="focusable rounded hover:text-[var(--color-danger)]"
                  >
                    Supprimer
                  </button>
                )}
              </div>
              <p className="whitespace-pre-wrap">{comment.body}</p>
            </li>
          ))}
        </ul>
      )}

      {step.canEdit && (
        <form
          action={async (formData) => {
            await action(formData);
            draft.clear();
            toast({ message: "Message envoyé au client." });
          }}
        >
          <input type="hidden" name="stepId" value={step.id} />
          <Textarea
            name="body"
            placeholder="Écrire au client…"
            required
            value={draft.value}
            onChange={(event) => draft.set(event.target.value)}
          />
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
            <p className="mt-1 text-sm text-[var(--color-danger)]">
              {state.error}
            </p>
          )}
        </form>
      )}
    </section>
  );
}
