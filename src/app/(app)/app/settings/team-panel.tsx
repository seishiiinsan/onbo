"use client";

import Link from "next/link";
import { useActionState, useTransition } from "react";
import type { MembershipRole } from "@prisma/client";
import {
  addTeamMember,
  removeTeamMember,
  setTeamRole,
  type FormState,
} from "@/app/actions/team";
import { AGENCY_ROLE_LABEL } from "@/lib/access";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";

const initial: FormState = {};

type Member = {
  userId: string;
  email: string;
  role: MembershipRole;
  projectCount: number;
  isSelf: boolean;
};

export function TeamPanel({
  members,
  canManage,
  isOwner,
}: {
  members: Member[];
  canManage: boolean;
  isOwner: boolean;
}) {
  const [state, action, pending] = useActionState(addTeamMember, initial);
  const [busy, startTransition] = useTransition();

  return (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle>Équipe</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="mb-4 space-y-2">
          {members.map((member) => (
            <li
              key={member.userId}
              className="flex flex-wrap items-center gap-2 rounded-lg bg-[var(--color-canvas)] px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  <Link
                    href={`/app/settings/members/${member.userId}`}
                    className="focusable rounded hover:underline"
                  >
                    {member.email}
                  </Link>
                  {member.isSelf && (
                    <span className="text-[var(--color-muted)]"> (vous)</span>
                  )}
                </p>
                <p className="text-xs text-[var(--color-muted)]">
                  {member.role === "MEMBER"
                    ? `${member.projectCount} projet(s) affecté(s)`
                    : "Accès à tous les projets de l'agence"}
                </p>
              </div>

              {canManage && !member.isSelf ? (
                <>
                  <Select
                    defaultValue={member.role}
                    disabled={busy}
                    onChange={(event) => {
                      const role = event.target.value as MembershipRole;
                      startTransition(() => {
                        void setTeamRole(member.userId, role);
                      });
                    }}
                    className="h-8 w-44 text-xs"
                  >
                    {isOwner && <option value="OWNER">Propriétaire</option>}
                    <option value="ADMIN">Directeur de projet</option>
                    <option value="MEMBER">Membre</option>
                  </Select>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      startTransition(() => {
                        void removeTeamMember(member.userId);
                      })
                    }
                    className="text-xs text-[var(--color-muted)] hover:text-[var(--color-danger)]"
                  >
                    Retirer
                  </button>
                </>
              ) : (
                <span className="text-xs text-[var(--color-muted)]">
                  {AGENCY_ROLE_LABEL[member.role]}
                </span>
              )}
            </li>
          ))}
        </ul>

        {canManage && (
          <form
            action={action}
            className="flex flex-wrap gap-2 border-t border-[var(--color-line)] pt-4"
          >
            <Input
              name="email"
              type="email"
              placeholder="collegue@agence.fr"
              required
              className="w-56"
            />
            <Select name="role" defaultValue="MEMBER" className="w-44">
              {isOwner && <option value="OWNER">Propriétaire</option>}
              <option value="ADMIN">Directeur de projet</option>
              <option value="MEMBER">Membre</option>
            </Select>
            <Button type="submit" size="sm" disabled={pending}>
              Ajouter
            </Button>
            {state.error && (
              <p className="w-full text-sm text-[var(--color-danger)]">
                {state.error}
              </p>
            )}
            <p className="w-full text-xs text-[var(--color-muted)]">
              La personne se connecte avec cette adresse, par lien magique. Un
              membre ne voit que les projets où vous l&apos;affectez.
            </p>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
