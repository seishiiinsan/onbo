import type { OnboardingStep, StepStatus } from "@prisma/client";

/** Une etape validee compte pour 1, une etape soumise pour 0,5. */
const WEIGHT: Record<StepStatus, number> = {
  PENDING: 0,
  IN_PROGRESS: 0.25,
  SUBMITTED: 0.5,
  VALIDATED: 1,
};

/** Au-dela de ce delai sans mouvement, une etape est consideree bloquee. */
export const STALE_DAYS = 5;

export function isStale(step: { status: StepStatus; updatedAt: Date }) {
  if (step.status === "VALIDATED" || step.status === "SUBMITTED") return false;
  return Date.now() - step.updatedAt.getTime() > STALE_DAYS * 86_400_000;
}

/**
 * Avancement du projet.
 * Les etapes optionnelles n'entrent pas dans le calcul (item 23) : les
 * traiter est un bonus, pas une condition pour atteindre 100 %.
 */
export function progressOf(
  steps: (Pick<OnboardingStep, "status"> & { required?: boolean })[],
) {
  const counted = steps.filter((step) => step.required !== false);
  if (counted.length === 0) return 0;

  const total = counted.reduce((sum, step) => sum + WEIGHT[step.status], 0);
  return Math.round((total / counted.length) * 100);
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
