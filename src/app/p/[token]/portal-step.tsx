"use client";

import { useTransition } from "react";
import type { StepStatus } from "@prisma/client";
import { clientSetStepStatus } from "@/app/actions/portal";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type Props = {
  token: string;
  step: {
    id: string;
    title: string;
    description: string | null;
    kindLabel: string;
    status: StepStatus;
    statusLabel: string;
  };
};

export function PortalStep({ token, step }: Props) {
  const [pending, startTransition] = useTransition();
  const locked = step.status === "VALIDATED";

  const move = (status: "IN_PROGRESS" | "SUBMITTED" | "PENDING") =>
    startTransition(() => {
      void clientSetStepStatus(token, step.id, status);
    });

  return (
    <li>
      <Card>
        <CardContent>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium">{step.title}</span>
                <span className="rounded bg-[var(--color-canvas)] px-1.5 py-0.5 text-[11px] text-[var(--color-muted)]">
                  {step.kindLabel}
                </span>
              </div>
              {step.description && (
                <p className="mt-1 text-sm text-[var(--color-muted)]">
                  {step.description}
                </p>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {locked ? (
                <span className="text-xs font-medium text-green-700">
                  Validé
                </span>
              ) : step.status === "SUBMITTED" ? (
                <>
                  <span className="text-xs text-[var(--color-muted)]">
                    Envoyé, en attente de validation
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={pending}
                    onClick={() => move("IN_PROGRESS")}
                  >
                    Reprendre
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
                    C&apos;est fait
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </li>
  );
}
