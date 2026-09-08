"use client";

import { useActionState } from "react";
import {
  deleteAgencySpace,
  deleteClientData,
  type RgpdState,
} from "@/app/actions/rgpd";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Donnees personnelles (issue #45) : export complet, suppression d'un contact,
 * suppression de l'espace. Trois demandes que le RGPD rend obligatoires et
 * qui doivent se traiter sans nous ecrire.
 */
const initial: RgpdState = {};

export function PrivacyPanel({
  canManage,
  isOwner,
  agencyName,
}: {
  canManage: boolean;
  isOwner: boolean;
  agencyName: string;
}) {
  const [clientState, clientAction, deletingClient] = useActionState(
    deleteClientData,
    initial,
  );
  const [spaceState, spaceAction, deletingSpace] = useActionState(
    deleteAgencySpace,
    initial,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Données personnelles</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <p className="text-sm text-[var(--color-muted)]">
            Export complet de l&apos;espace : projets, étapes, échanges,
            contacts, journal. Les secrets du coffre n&apos;y figurent pas,
            seule leur existence est exportée.
          </p>
          <a href="/api/rgpd/export" className="mt-2.5 inline-block">
            <Button size="sm" variant="outline" disabled={!canManage}>
              Exporter mes données
            </Button>
          </a>
        </div>

        {canManage && (
          <form action={clientAction} className="border-t border-[var(--color-line)] pt-5">
            <Label htmlFor="rgpd-email">Supprimer les données d&apos;un contact</Label>
            <p className="mb-2 text-xs text-[var(--color-muted)]">
              Identité, rattachements et emails envoyés. Les fichiers déposés
              restent au projet, dont votre agence est responsable de
              traitement.
            </p>
            <div className="flex gap-2">
              <Input
                id="rgpd-email"
                name="email"
                type="email"
                placeholder="contact@client.fr"
                required
              />
              <Button type="submit" size="sm" variant="outline" disabled={deletingClient}>
                {deletingClient ? "Suppression…" : "Supprimer"}
              </Button>
            </div>
            {clientState.error && (
              <p className="mt-2 text-sm text-[var(--color-danger)]">
                {clientState.error}
              </p>
            )}
            {clientState.done && (
              <p className="mt-2 text-sm text-[var(--color-muted)]">
                {clientState.done}
              </p>
            )}
          </form>
        )}

        {isOwner && (
          <form action={spaceAction} className="border-t border-[var(--color-line)] pt-5">
            <Label htmlFor="rgpd-confirm">Supprimer l&apos;espace</Label>
            <p className="mb-2 text-xs text-[var(--color-muted)]">
              Projets, fichiers, coffre et journal sont effacés
              immédiatement. Il n&apos;y a pas de corbeille. Recopiez «{" "}
              {agencyName} » pour confirmer.
            </p>
            <div className="flex gap-2">
              <Input
                id="rgpd-confirm"
                name="confirmation"
                placeholder={agencyName}
                required
              />
              <Button type="submit" size="sm" variant="outline" disabled={deletingSpace}>
                {deletingSpace ? "Suppression…" : "Supprimer"}
              </Button>
            </div>
            {spaceState.error && (
              <p className="mt-2 text-sm text-[var(--color-danger)]">
                {spaceState.error}
              </p>
            )}
          </form>
        )}
      </CardContent>
    </Card>
  );
}
