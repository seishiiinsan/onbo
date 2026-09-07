import type { CredentialKind } from "@prisma/client";

export const CREDENTIAL_KIND_LABEL: Record<CredentialKind, string> = {
  HOSTING: "Hébergeur",
  DOMAIN: "Nom de domaine",
  CMS: "CMS",
  SOCIAL: "Réseau social",
  ANALYTICS: "Analytics",
  OTHER: "Autre",
};
