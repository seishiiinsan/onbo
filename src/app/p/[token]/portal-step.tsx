"use client";

import { useActionState, useOptimistic, useState, useTransition } from "react";
import type { CommentAuthor, StepKind, StepStatus } from "@prisma/client";
import { TriangleAlert } from "lucide-react";
import {
  clientAddComment,
  clientAddCredential,
  clientSetStepStatus,
  type PortalFormState,
} from "@/app/actions/portal";
import { CREDENTIAL_KIND_LABEL } from "@/components/credential-kind";
import { StepIcon } from "@/components/step-icon";
import { AssetThumb, formatSize, Uploader } from "@/components/uploader";
import { StepBadge, Tag } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import type { Dictionary } from "@/lib/portal-i18n";
import { useDraft } from "@/lib/use-draft";
import { cn } from "@/lib/utils";

const initial: PortalFormState = {};

type Step = {
  id: string;
  title: string;
  description: string | null;
  kind: StepKind;
  status: StepStatus;
  required: boolean;
  blockedNote: string | null;
  assets: { id: string; filename: string; mimeType: string; size: number }[];
  credentials: { id: string; label: string }[];
  comments: { id: string; body: string; author: CommentAuthor; at: string }[];
};

export function PortalStep({
  token,
  agencyName,
  step,
  t,
  highlighted,
}: {
  token: string;
  agencyName: string;
  step: Step;
  t: Dictionary;
  highlighted: boolean;
}) {
  const toast = useToast();
  const [open, setOpen] = useState(highlighted || step.status !== "VALIDATED");
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useOptimistic(step.status);
  const locked = status === "VALIDATED";

  const move = (next: "IN_PROGRESS" | "SUBMITTED") =>
    startTransition(async () => {
      setStatus(next);
      await clientSetStepStatus(token, step.id, next);
      toast({
        message:
          next === "SUBMITTED"
            ? t.submitted(agencyName)
            : t.inProgress,
      });
    });

  return (
    <li
      data-print-open
      className={cn(
        "rounded-[var(--radius-card)] border bg-[var(--color-surface)]",
        highlighted
          ? "border-[var(--color-brand)]/40"
          : step.blockedNote
            ? "border-[var(--color-progress)]/40"
            : "border-[var(--color-line)]",
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="focusable flex w-full items-start justify-between gap-3 rounded-[var(--radius-card)] p-5 text-left"
      >
        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-2">
            <StepIcon kind={step.kind} />
            <span className="font-medium">{step.title}</span>
            {!step.required && <Tag>Option</Tag>}
            <StepBadge status={status} />
          </span>
          {step.description && (
            <span className="mt-1 block text-sm text-[var(--color-muted)]">
              {step.description}
            </span>
          )}
        </span>
        <span className="no-print shrink-0 text-xs text-[var(--color-muted)]">
          {open ? t.collapse : t.expand}
        </span>
      </button>

      {step.blockedNote && (
        <p className="flex items-start gap-2 border-t border-[var(--color-line)] bg-[var(--color-progress-soft)] px-5 py-2.5 text-sm text-[var(--color-progress)]">
          <TriangleAlert size={15} className="mt-0.5 shrink-0" />
          <span>
            <span className="font-medium">{t.blocked} : </span>
            {step.blockedNote}
          </span>
        </p>
      )}

      {open && (
        <div className="space-y-6 border-t border-[var(--color-line)] p-5">
          {locked ? (
            <p className="text-sm text-[var(--color-validated)]">
              {t.validated(agencyName)}
            </p>
          ) : (
            <>
              <Files token={token} step={step} t={t} />
              <Credentials token={token} step={step} t={t} />
            </>
          )}

          <Messages
            token={token}
            step={step}
            agencyName={agencyName}
            t={t}
          />

          {!locked && (
            <div className="no-print flex flex-wrap items-center gap-2 border-t border-[var(--color-line)] pt-4">
              {status === "SUBMITTED" ? (
                <>
                  <p className="flex-1 text-sm text-[var(--color-muted)]">
                    {t.submitted(agencyName)}
                  </p>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={pending}
                    onClick={() => move("IN_PROGRESS")}
                  >
                    {t.reopen}
                  </Button>
                </>
              ) : (
                <>
                  {status === "PENDING" && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={pending}
                      onClick={() => move("IN_PROGRESS")}
                    >
                      {t.inProgress}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="accent"
                    disabled={pending}
                    onClick={() => move("SUBMITTED")}
                  >
                    {t.complete}
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

function Files({
  token,
  step,
  t,
}: {
  token: string;
  step: Step;
  t: Dictionary;
}) {
  return (
    <section>
      <h3 className="section-label mb-2">{t.yourFiles}</h3>

      {step.assets.length > 0 && (
        <ul className="mb-3 space-y-1.5">
          {step.assets.map((asset) => (
            <li
              key={asset.id}
              className="flex items-center gap-2.5 rounded-lg bg-[var(--color-canvas)] px-2.5 py-2 text-sm"
            >
              <AssetThumb asset={asset} token={token} />
              <a
                href={`/api/files/${asset.id}?token=${token}`}
                className="focusable min-w-0 flex-1 truncate rounded hover:underline"
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

      <div className="no-print">
        <Uploader stepId={step.id} token={token} label={t.dropFiles} />
      </div>
    </section>
  );
}

function Credentials({
  token,
  step,
  t,
}: {
  token: string;
  step: Step;
  t: Dictionary;
}) {
  const [state, action, pending] = useActionState(clientAddCredential, initial);
  const [adding, setAdding] = useState(false);
  const toast = useToast();

  return (
    <section>
      <h3 className="section-label mb-2">{t.yourAccess}</h3>

      {step.credentials.length > 0 && (
        <ul className="mb-3 space-y-1.5">
          {step.credentials.map((credential) => (
            <li
              key={credential.id}
              className="flex items-center gap-2 rounded-lg bg-[var(--color-canvas)] px-3 py-2 text-sm"
            >
              <span className="flex-1 truncate">{credential.label}</span>
              <span className="text-xs text-[var(--color-muted)]">
                {t.transmitted}
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="no-print">
        {adding ? (
          <form
            action={async (formData) => {
              await action(formData);
              toast({ message: t.transmitted });
              setAdding(false);
            }}
            className="space-y-2"
          >
            <input type="hidden" name="token" value={token} />
            <input type="hidden" name="stepId" value={step.id} />
            <Input name="label" placeholder={t.sendAccess} required />
            <Select name="kind" defaultValue="OTHER">
              {Object.entries(CREDENTIAL_KIND_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
            <Input name="url" placeholder="https://…" type="url" />
            <Input name="username" placeholder="Identifiant / username" />
            <Input name="secret" type="password" placeholder="••••••••" required />
            {state.error && (
              <p className="text-sm text-[var(--color-danger)]">{state.error}</p>
            )}
            <div className="flex gap-2">
              <Button type="submit" size="sm" variant="accent" disabled={pending}>
                {t.sendAccess}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setAdding(false)}
              >
                ✕
              </Button>
            </div>
          </form>
        ) : (
          <>
            <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
              {t.sendAccess}
            </Button>
            <p className="mt-1.5 text-xs text-[var(--color-muted)]">
              {t.accessHint}
            </p>
          </>
        )}
      </div>
    </section>
  );
}

function Messages({
  token,
  step,
  agencyName,
  t,
}: {
  token: string;
  step: Step;
  agencyName: string;
  t: Dictionary;
}) {
  const [state, action, pending] = useActionState(clientAddComment, initial);
  const toast = useToast();
  const draft = useDraft(`portal-comment:${step.id}`);

  return (
    <section>
      <h3 className="section-label mb-2">{t.messages}</h3>

      {step.comments.length > 0 && (
        <ul className="mb-3 space-y-2">
          {step.comments.map((comment) => (
            <li
              key={comment.id}
              className="rounded-lg bg-[var(--color-canvas)] px-3 py-2 text-sm"
            >
              <p className="mb-0.5 text-[11px] text-[var(--color-muted)]">
                {comment.author === "AGENCY" ? agencyName : t.you} · {comment.at}
              </p>
              <p className="whitespace-pre-wrap">{comment.body}</p>
            </li>
          ))}
        </ul>
      )}

      <form
        action={async (formData) => {
          await action(formData);
          draft.clear();
          toast({ message: t.send });
        }}
        className="no-print"
      >
        <input type="hidden" name="token" value={token} />
        <input type="hidden" name="stepId" value={step.id} />
        <Textarea
          name="body"
          required
          placeholder={t.questionPlaceholder}
          value={draft.value}
          onChange={(event) => draft.set(event.target.value)}
        />
        {state.error && (
          <p className="mt-1 text-sm text-[var(--color-danger)]">{state.error}</p>
        )}
        <Button type="submit" size="sm" className="mt-2" disabled={pending}>
          {t.send}
        </Button>
      </form>
    </section>
  );
}
