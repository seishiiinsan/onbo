"use client";

import { useState, useTransition } from "react";
import { CalendarDays, Check, CopyPlus } from "lucide-react";
import {
  duplicateProject,
  setDueDate,
  validateAllSubmitted,
} from "@/app/actions/project";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";

/** Actions groupees (item 17), duplication (item 20), echeance (item 10). */
export function ProjectToolbar({
  projectId,
  submittedCount,
  dueDate,
  canEdit,
}: {
  projectId: string;
  submittedCount: number;
  /** Format YYYY-MM-DD, attendu par l'input date. */
  dueDate: string;
  canEdit: boolean;
}) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [editingDue, setEditingDue] = useState(false);

  if (!canEdit) return null;

  return (
    <div className="mb-6 flex flex-wrap items-center gap-2">
      {submittedCount > 0 && (
        <Button
          size="sm"
          variant="accent"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const count = await validateAllSubmitted(projectId);
              toast({ message: `${count} étape(s) validée(s).` });
            })
          }
        >
          <Check size={14} />
          Tout valider ({submittedCount})
        </Button>
      )}

      {editingDue ? (
        <form
          action={(formData) =>
            startTransition(async () => {
              await setDueDate(
                projectId,
                String(formData.get("dueDate") ?? ""),
              );
              toast({ message: "Échéance mise à jour." });
              setEditingDue(false);
            })
          }
          className="flex items-center gap-2"
        >
          <Input
            name="dueDate"
            type="date"
            defaultValue={dueDate}
            className="h-9 w-44"
          />
          <Button type="submit" size="sm" disabled={pending}>
            Enregistrer
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setEditingDue(false)}
          >
            Annuler
          </Button>
        </form>
      ) : (
        <Button size="sm" variant="outline" onClick={() => setEditingDue(true)}>
          <CalendarDays size={14} />
          {dueDate
            ? `Échéance : ${new Date(dueDate).toLocaleDateString("fr-FR")}`
            : "Fixer une échéance"}
        </Button>
      )}

      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await duplicateProject(projectId);
          })
        }
      >
        <CopyPlus size={14} />
        Dupliquer
      </Button>
    </div>
  );
}
