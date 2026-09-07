"use client";

import { useActionState } from "react";
import { updateReminders, type FormState } from "@/app/actions/project";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const initial: FormState = {};

export function RemindersPanel({
  projectId,
  enabled,
  days,
  lastReminderAt,
}: {
  projectId: string;
  enabled: boolean;
  days: number;
  lastReminderAt: string | null;
}) {
  const [state, action, pending] = useActionState(updateReminders, initial);

  return (
    <Card className="self-start">
      <CardHeader>
        <CardTitle>Relances</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action}>
          <input type="hidden" name="projectId" value={projectId} />

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="remindersEnabled"
              defaultChecked={enabled}
            />
            Relancer automatiquement
          </label>

          <div className="mt-3 flex items-center gap-2">
            <Input
              name="reminderDays"
              type="number"
              min={1}
              max={30}
              defaultValue={days}
              className="w-20"
            />
            <span className="text-sm text-[var(--color-muted)]">
              jours sans activité
            </span>
          </div>

          {state.error && (
            <p className="mt-2 text-sm text-[var(--color-danger)]">
              {state.error}
            </p>
          )}

          <Button type="submit" size="sm" variant="outline" className="mt-3">
            {pending ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </form>

        <p className="mt-3 text-xs text-[var(--color-muted)]">
          {lastReminderAt
            ? `Dernière relance : ${lastReminderAt}`
            : "Aucune relance envoyée."}
        </p>
      </CardContent>
    </Card>
  );
}
