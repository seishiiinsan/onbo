"use client";

import { useActionState } from "react";
import { clientAddComment, type PortalFormState } from "@/app/actions/portal";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useDraft } from "@/lib/use-draft";

const initial: PortalFormState = {};

/** Question libre, sans avoir a choisir une etape (item 35). */
export function QuestionBox({
  token,
  stepId,
  label,
  placeholder,
  sendLabel,
}: {
  token: string;
  stepId: string;
  label: string;
  placeholder: string;
  sendLabel: string;
}) {
  const [state, action, pending] = useActionState(clientAddComment, initial);
  const toast = useToast();
  const draft = useDraft(`portal-question:${token}`);

  return (
    <section className="no-print mt-10 rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface)] p-5">
      <h2 className="font-display text-xl">{label}</h2>

      <form
        action={async (formData) => {
          await action(formData);
          draft.clear();
          toast({
            message: sendLabel === "Send" ? "Message sent." : "Message envoyé.",
          });
        }}
        className="mt-3"
      >
        <input type="hidden" name="token" value={token} />
        <input type="hidden" name="stepId" value={stepId} />
        <Textarea
          name="body"
          required
          placeholder={placeholder}
          value={draft.value}
          onChange={(event) => draft.set(event.target.value)}
        />
        {state.error && (
          <p className="mt-1 text-sm text-[var(--color-danger)]">
            {state.error}
          </p>
        )}
        <Button type="submit" size="sm" className="mt-2" disabled={pending}>
          {sendLabel}
        </Button>
      </form>
    </section>
  );
}
