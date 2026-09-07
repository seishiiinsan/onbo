"use client";

import { useActionState, useState, useTransition } from "react";
import type { ProjectStatus } from "@prisma/client";
import {
  renameProject,
  setProjectStatus,
  type FormState,
} from "@/app/actions/project";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const initial: FormState = {};

const STATUSES: { value: ProjectStatus; label: string }[] = [
  { value: "DRAFT", label: "Brouillon" },
  { value: "ACTIVE", label: "En cours" },
  { value: "COMPLETED", label: "Terminé" },
  { value: "ARCHIVED", label: "Archivé" },
];

type Props = {
  project: {
    id: string;
    name: string;
    status: ProjectStatus;
    statusLabel: string;
  };
};

export function ProjectHeader({ project }: Props) {
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState(renameProject, initial);
  const [statusPending, startTransition] = useTransition();

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      {editing ? (
        <form
          action={(formData) => {
            action(formData);
            setEditing(false);
          }}
          className="flex items-center gap-2"
        >
          <input type="hidden" name="projectId" value={project.id} />
          <Input
            name="name"
            defaultValue={project.name}
            autoFocus
            className="w-64"
          />
          <Button type="submit" size="sm" disabled={pending}>
            Enregistrer
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setEditing(false)}
          >
            Annuler
          </Button>
        </form>
      ) : (
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold tracking-tight">
            {project.name}
          </h1>
          <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
            Renommer
          </Button>
        </div>
      )}

      <select
        value={project.status}
        disabled={statusPending}
        onChange={(event) => {
          const next = event.target.value as ProjectStatus;
          startTransition(() => {
            void setProjectStatus(project.id, next);
          });
        }}
        className="h-9 rounded-lg border border-[var(--color-line)] bg-white px-3 text-sm"
      >
        {STATUSES.map((status) => (
          <option key={status.value} value={status.value}>
            {status.label}
          </option>
        ))}
      </select>

      {state.error && (
        <p className="w-full text-sm text-red-600">{state.error}</p>
      )}
    </div>
  );
}
