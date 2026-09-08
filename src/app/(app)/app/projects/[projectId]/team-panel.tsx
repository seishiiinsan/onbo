"use client";

import { useActionState, useTransition } from "react";
import type { ProjectRole } from "@prisma/client";
import {
  assignToProject,
  toggleCredentialAccess,
  unassignFromProject,
  type FormState,
} from "@/app/actions/team";
import { PROJECT_ROLE_LABEL } from "@/lib/access";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/input";

const initial: FormState = {};

type Assignment = {
  id: string;
  userId: string;
  email: string;
  role: ProjectRole;
  canViewCredentials: boolean;
};

export function ProjectTeamPanel({
  projectId,
  assignments,
  assignable,
}: {
  projectId: string;
  assignments: Assignment[];
  /** Membres de l'agence pas encore affectes a ce projet. */
  assignable: { userId: string; email: string }[];
}) {
  const [state, action, pending] = useActionState(assignToProject, initial);
  const [busy, startTransition] = useTransition();

  return (
    <Card className="self-start">
      <CardHeader>
        <CardTitle>Équipe du projet</CardTitle>
      </CardHeader>
      <CardContent>
        {assignments.length === 0 ? (
          <p className="mb-3 text-sm text-[var(--color-muted)]">
            Personne d&apos;affecté. Les directeurs de projet y ont accès de
            toute façon.
          </p>
        ) : (
          <ul className="mb-4 space-y-2">
            {assignments.map((assignment) => (
              <li
                key={assignment.id}
                className="rounded-lg bg-[var(--color-canvas)] px-3 py-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {assignment.email}
                  </span>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      startTransition(() => {
                        void unassignFromProject(assignment.id);
                      })
                    }
                    className="text-xs text-[var(--color-muted)] hover:text-[var(--color-danger)]"
                  >
                    Retirer
                  </button>
                </div>

                <p className="mt-0.5 text-xs text-[var(--color-muted)]">
                  {PROJECT_ROLE_LABEL[assignment.role]}
                </p>

                <label className="mt-1.5 flex items-center gap-1.5 text-xs">
                  <input
                    type="checkbox"
                    checked={assignment.canViewCredentials}
                    disabled={busy}
                    onChange={(event) => {
                      const next = event.target.checked;
                      startTransition(() => {
                        void toggleCredentialAccess(assignment.id, next);
                      });
                    }}
                  />
                  Accès au coffre
                </label>
              </li>
            ))}
          </ul>
        )}

        {assignable.length > 0 && (
          <form
            action={action}
            className="space-y-2 border-t border-[var(--color-line)] pt-4"
          >
            <input type="hidden" name="projectId" value={projectId} />
            <Select name="userId" required>
              {assignable.map((member) => (
                <option key={member.userId} value={member.userId}>
                  {member.email}
                </option>
              ))}
            </Select>
            <Select name="role" defaultValue="CONTRIBUTOR">
              <option value="LEAD">Responsable</option>
              <option value="CONTRIBUTOR">Contributeur</option>
              <option value="VIEWER">Lecture seule</option>
            </Select>
            <label className="flex items-center gap-1.5 text-xs">
              <input type="checkbox" name="canViewCredentials" />
              Peut voir les accès du client
            </label>
            {state.error && (
              <p className="text-sm text-[var(--color-danger)]">
                {state.error}
              </p>
            )}
            <Button
              type="submit"
              size="sm"
              variant="outline"
              disabled={pending}
            >
              Affecter
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
