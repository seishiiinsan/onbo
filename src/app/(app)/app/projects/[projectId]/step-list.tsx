"use client";

import { useState, useTransition } from "react";
import { GripVertical } from "lucide-react";
import { reorderSteps } from "@/app/actions/project";
import { useToast } from "@/components/ui/toast";
import { StepCard, type StepCardData } from "./step-card";

/**
 * Liste des etapes : ouverture d'une seule a la fois, et reordonnancement
 * par glisser-deposer (item 16).
 *
 * Glisser-deposer natif HTML5, sans dependance. La carte n'est deplaçable
 * qu'apres appui sur la poignee, sinon selectionner du texte declencherait
 * un deplacement.
 */
export function StepList({
  projectId,
  steps,
  canEdit,
}: {
  projectId: string;
  steps: StepCardData[];
  canEdit: boolean;
}) {
  const toast = useToast();
  const [, startTransition] = useTransition();
  const [order, setOrder] = useState<string[]>(steps.map((step) => step.id));
  const [dragging, setDragging] = useState<string | null>(null);
  const [armed, setArmed] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const byId = new Map(steps.map((step) => [step.id, step]));
  const ordered = [
    ...order.map((id) => byId.get(id)).filter(Boolean),
    ...steps.filter((step) => !order.includes(step.id)),
  ] as StepCardData[];

  const drop = (targetId: string) => {
    if (!dragging || dragging === targetId) return;

    const next = ordered.map((step) => step.id);
    const from = next.indexOf(dragging);
    const to = next.indexOf(targetId);
    next.splice(to, 0, next.splice(from, 1)[0]);

    setOrder(next);
    setDragging(null);
    setArmed(null);

    startTransition(async () => {
      await reorderSteps(projectId, next);
      toast({ message: "Ordre enregistré." });
    });
  };

  return (
    <ul className="grid gap-2.5">
      {ordered.map((step) => (
        <StepCard
          key={step.id}
          step={step}
          open={openId === step.id}
          onToggle={() => setOpenId(openId === step.id ? null : step.id)}
          handle={
            canEdit ? (
              <span
                role="button"
                tabIndex={-1}
                aria-label="Déplacer l'étape"
                onMouseDown={() => setArmed(step.id)}
                onMouseUp={() => setArmed(null)}
                className="mt-0.5 cursor-grab text-[var(--color-muted)] active:cursor-grabbing"
              >
                <GripVertical size={15} />
              </span>
            ) : null
          }
          dragHandlers={
            canEdit
              ? {
                  draggable: armed === step.id,
                  onDragStart: () => setDragging(step.id),
                  onDragEnd: () => {
                    setDragging(null);
                    setArmed(null);
                  },
                  onDragOver: (event) => event.preventDefault(),
                  onDrop: (event) => {
                    event.preventDefault();
                    drop(step.id);
                  },
                }
              : undefined
          }
        />
      ))}
    </ul>
  );
}
