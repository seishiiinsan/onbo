import type { OnboardingStep, StepStatus } from "@prisma/client";

/** Une etape validee compte pour 1, une etape soumise pour 0,5. */
const WEIGHT: Record<StepStatus, number> = {
  PENDING: 0,
  IN_PROGRESS: 0.25,
  SUBMITTED: 0.5,
  VALIDATED: 1,
};

export function progressOf(steps: Pick<OnboardingStep, "status">[]) {
  if (steps.length === 0) return 0;
  const total = steps.reduce((sum, step) => sum + WEIGHT[step.status], 0);
  return Math.round((total / steps.length) * 100);
}

export const STATUS_LABEL: Record<StepStatus, string> = {
  PENDING: "À faire",
  IN_PROGRESS: "En cours",
  SUBMITTED: "Soumis",
  VALIDATED: "Validé",
};

export const KIND_LABEL = {
  ASSETS: "Assets",
  ACCESS: "Accès",
  BRIEF: "Brief",
  CONTENT: "Contenu",
  OTHER: "Autre",
} as const;

export const PROJECT_STATUS_LABEL = {
  DRAFT: "Brouillon",
  ACTIVE: "En cours",
  COMPLETED: "Terminé",
  ARCHIVED: "Archivé",
} as const;
