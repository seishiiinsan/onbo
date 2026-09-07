"use client";

import { useTransition } from "react";
import type { StepKind, StepStatus } from "@prisma/client";
import { deleteStep, setStepStatus } from "@/app/actions/project";
import { KIND_LABEL, STATUS_LABEL } from "@/lib/progress";
import { Button } from "@/components/ui/button";

const STATUSES: StepStatus[] = [
  "PENDING",
  "IN_PROGRESS",
  "SUBMITTED",
  "VALIDATED",
];

type Props = {
  step: {
    id: string;
    title: string;
    description: string | null;
    kind: StepKind;
    status: StepStatus;
  };
};

export function StepRow({ step }: Props) {
  const [pending, startTransition] = useTransition();

  return (
    <li className="flex items-start justify-between gap-4 border-b border-[var(--color-line)] p-4 last:border-b-0">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{step.title}</span>
          <span className="rounded bg-[var(--color-canvas)] px-1.5 py-0.5 text-[11px] text-[var(--color-muted)]">
            {KIND_LABEL[step.kind]}
          </span>
        </div>
        {step.description && (
          <p className="mt-0.5 text-xs text-[var(--color-muted)]">
            {step.description}
          </p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <select
          value={step.status}
          disabled={pending}
          onChange={(event) => {
            const next = event.target.value as StepStatus;
            startTransition(() => {
              void setStepStatus(step.id, next);
            });
          }}
          className="h-8 rounded-lg border border-[var(--color-line)] bg-white px-2 text-xs"
        >
          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABEL[status]}
            </option>
          ))}
        </select>
        <Button
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() =>
            startTransition(() => {
              void deleteStep(step.id);
            })
          }
        >
          Suppr.
        </Button>
      </div>
    </li>
  );
}
