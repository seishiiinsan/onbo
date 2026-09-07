import {
  FileText,
  Image as ImageIcon,
  KeyRound,
  ListChecks,
  PenLine,
} from "lucide-react";
import type { StepKind } from "@prisma/client";

const ICONS = {
  ASSETS: ImageIcon,
  ACCESS: KeyRound,
  BRIEF: PenLine,
  CONTENT: FileText,
  OTHER: ListChecks,
} as const;

export function StepIcon({
  kind,
  size = 16,
}: {
  kind: StepKind;
  size?: number;
}) {
  const Icon = ICONS[kind];
  return <Icon size={size} className="shrink-0 text-[var(--color-muted)]" />;
}
