import type { ProjectStatus, StepStatus } from "@prisma/client";
import { cn } from "@/lib/utils";
import { PROJECT_STATUS_LABEL, STATUS_LABEL } from "@/lib/progress";

const STEP_TONE: Record<StepStatus, string> = {
  PENDING: "bg-black/[0.04] text-[var(--color-pending)]",
  IN_PROGRESS: "bg-[var(--color-progress-soft)] text-[var(--color-progress)]",
  SUBMITTED: "bg-[var(--color-submitted-soft)] text-[var(--color-submitted)]",
  VALIDATED: "bg-[var(--color-validated-soft)] text-[var(--color-validated)]",
};

const PROJECT_TONE: Record<ProjectStatus, string> = {
  DRAFT: "bg-black/[0.04] text-[var(--color-muted)]",
  ACTIVE: "bg-[var(--color-brand-soft)] text-[var(--color-brand-ink)]",
  COMPLETED: "bg-[var(--color-validated-soft)] text-[var(--color-validated)]",
  ARCHIVED: "bg-black/[0.04] text-[var(--color-muted)]",
};

const shell =
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium leading-none";

export function StepBadge({
  status,
  className,
}: {
  status: StepStatus;
  className?: string;
}) {
  return (
    <span className={cn(shell, STEP_TONE[status], className)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {STATUS_LABEL[status]}
    </span>
  );
}

export function ProjectBadge({ status }: { status: ProjectStatus }) {
  return (
    <span className={cn(shell, PROJECT_TONE[status])}>
      {PROJECT_STATUS_LABEL[status]}
    </span>
  );
}

export function Tag({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md bg-black/[0.04] px-1.5 py-0.5 text-[11px] text-[var(--color-muted)]",
        className,
      )}
    >
      {children}
    </span>
  );
}
