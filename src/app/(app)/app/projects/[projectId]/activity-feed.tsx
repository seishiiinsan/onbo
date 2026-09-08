import type { ActivityActor } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const ACTOR_LABEL: Record<ActivityActor, string> = {
  AGENCY: "Agence",
  CLIENT: "Client",
  SYSTEM: "Onbo",
};

/** Journal d'activite du projet (item 18). */
export function ActivityFeed({
  entries,
}: {
  entries: {
    id: string;
    actor: ActivityActor;
    actorName: string | null;
    action: string;
    detail: string | null;
    at: string;
  }[];
}) {
  return (
    <Card className="self-start">
      <CardHeader>
        <CardTitle>Activité</CardTitle>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="text-sm text-[var(--color-muted)]">
            Rien encore. Les actions apparaîtront ici.
          </p>
        ) : (
          <ol className="space-y-3">
            {entries.map((entry) => (
              <li
                key={entry.id}
                className="border-l-2 border-[var(--color-line)] pl-3"
              >
                <p className="text-sm">
                  <span className="font-medium">
                    {entry.actorName ?? ACTOR_LABEL[entry.actor]}
                  </span>{" "}
                  {entry.action}
                  {entry.detail && (
                    <span className="text-[var(--color-muted)]">
                      {" "}
                      — {entry.detail}
                    </span>
                  )}
                </p>
                <p className="text-[11px] text-[var(--color-muted)]">
                  {entry.at}
                </p>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
