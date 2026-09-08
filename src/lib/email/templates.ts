import type { EmailCategory } from "@/lib/email/types";

/**
 * Gabarits HTML + texte (issue #29).
 *
 * Un seul habillage, decline en quatre messages : lien de connexion, lien de
 * portail, relance, notification. Le HTML reste en tableaux et styles inline,
 * seule mise en forme que les clients mail traitent correctement.
 */
export type Branding = {
  agencyName?: string | null;
  accentColor?: string | null;
  logoUrl?: string | null;
};

export type Template = {
  subject: string;
  text: string;
  html: string;
  category: EmailCategory;
};

const DEFAULT_ACCENT = "#2f6bff";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function paragraphs(lines: string[]) {
  return lines
    .filter((line) => line.trim() !== "")
    .map(
      (line) =>
        `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#1f2430;">${escapeHtml(line)}</p>`,
    )
    .join("");
}

function button(label: string, url: string, accent: string) {
  return `<p style="margin:24px 0;"><a href="${escapeHtml(url)}" style="display:inline-block;padding:12px 22px;border-radius:8px;background:${escapeHtml(accent)};color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">${escapeHtml(label)}</a></p>`;
}

function layout(
  branding: Branding,
  title: string,
  body: string,
  footerNote?: string,
) {
  const accent = branding.accentColor || DEFAULT_ACCENT;
  const agency = branding.agencyName || "Onbo";
  const header = branding.logoUrl
    ? `<img src="${escapeHtml(branding.logoUrl)}" alt="${escapeHtml(agency)}" style="max-height:40px;">`
    : `<span style="font-size:18px;font-weight:700;color:${escapeHtml(accent)};">${escapeHtml(agency)}</span>`;

  return `<!doctype html><html lang="fr"><body style="margin:0;padding:24px;background:#f5f6f8;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;border:1px solid #e5e7eb;">
<tr><td style="padding:24px 28px 8px;">${header}</td></tr>
<tr><td style="padding:0 28px;"><h1 style="margin:8px 0 18px;font-size:20px;line-height:1.3;color:#111827;">${escapeHtml(title)}</h1>${body}</td></tr>
<tr><td style="padding:8px 28px 24px;border-top:1px solid #eef0f3;">
<p style="margin:14px 0 0;font-size:12px;line-height:1.5;color:#6b7280;">${escapeHtml(footerNote ?? `Message envoyé par ${agency} via Onbo.`)}</p>
</td></tr></table></body></html>`;
}

export function loginLinkEmail(url: string, minutes: number): Template {
  const lines = [
    "Bonjour,",
    "Voici votre lien de connexion à Onbo. Il est valable " +
      `${minutes} minutes et ne fonctionne qu'une seule fois.`,
    url,
    "Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.",
  ];

  return {
    category: "LOGIN",
    subject: "Votre lien de connexion Onbo",
    text: lines.join("\n\n"),
    html: layout(
      {},
      "Votre lien de connexion",
      paragraphs(lines.slice(0, 2)) +
        button("Se connecter", url, DEFAULT_ACCENT) +
        paragraphs(lines.slice(3)),
      "Onbo — suivi d'onboarding client.",
    ),
  };
}

export function portalLinkEmail(input: {
  branding: Branding;
  projectName: string;
  clientName?: string | null;
  url: string;
  message?: string | null;
}): Template {
  const agency = input.branding.agencyName || "L'agence";
  const intro = input.message?.trim()
    ? input.message.trim().split("\n")
    : [
        `Bonjour${input.clientName ? ` ${input.clientName}` : ""},`,
        `${agency} a préparé votre espace pour ${input.projectName}. Vous y déposez les éléments attendus et suivez l'avancement en temps réel.`,
        "Aucun compte à créer : ce lien vous identifie.",
      ];

  return {
    category: "PORTAL",
    subject: `${input.projectName} — votre espace de suivi`,
    text: [...intro, "", input.url].join("\n"),
    html: layout(
      input.branding,
      `${input.projectName} — votre espace`,
      paragraphs(intro) +
        button(
          "Ouvrir mon espace",
          input.url,
          input.branding.accentColor || DEFAULT_ACCENT,
        ),
    ),
  };
}

export function reminderEmail(input: {
  branding: Branding;
  projectName: string;
  clientName?: string | null;
  pending: string[];
  url: string;
}): Template {
  const agency = input.branding.agencyName || "L'agence";
  const intro = [
    `Bonjour${input.clientName ? ` ${input.clientName}` : ""},`,
    `${agency} attend encore ces éléments pour avancer sur ${input.projectName} :`,
  ];

  const list = input.pending.map((title) => `· ${title}`);
  const listHtml = `<ul style="margin:0 0 14px 18px;padding:0;font-size:15px;line-height:1.7;color:#1f2430;">${input.pending
    .map((title) => `<li>${escapeHtml(title)}</li>`)
    .join("")}</ul>`;

  return {
    category: "REMINDER",
    subject: `${input.projectName} — il manque encore quelques éléments`,
    text: [
      ...intro,
      "",
      ...list,
      "",
      `Tout se dépose ici : ${input.url}`,
      "",
      "Merci !",
    ].join("\n"),
    html: layout(
      input.branding,
      "Il manque encore quelques éléments",
      paragraphs(intro) +
        listHtml +
        button(
          "Déposer les éléments",
          input.url,
          input.branding.accentColor || DEFAULT_ACCENT,
        ),
    ),
  };
}

export function notificationEmail(input: {
  branding?: Branding;
  title: string;
  lines: string[];
  url?: string | null;
  linkLabel?: string;
}): Template {
  const branding = input.branding ?? {};

  return {
    category: "NOTIFICATION",
    subject: input.title,
    text: [...input.lines, ...(input.url ? ["", input.url] : [])].join("\n"),
    html: layout(
      branding,
      input.title,
      paragraphs(input.lines) +
        (input.url
          ? button(
              input.linkLabel ?? "Ouvrir dans Onbo",
              input.url,
              branding.accentColor || DEFAULT_ACCENT,
            )
          : ""),
    ),
  };
}
