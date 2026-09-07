/**
 * Traductions du portail client (item 32).
 *
 * Volontairement limite au portail : c'est la seule surface ouverte a des
 * personnes qui ne travaillent pas dans l'agence. La langue est portee par
 * l'URL (?lang=en), donc partageable.
 */
export const LOCALES = ["fr", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export function parseLocale(value?: string): Locale {
  return LOCALES.includes(value as Locale) ? (value as Locale) : "fr";
}

type Strings = {
  intro: (agency: string) => string;
  remaining: (count: number) => string;
  allDone: string;
  completedTitle: string;
  completedBody: (agency: string) => string;
  nextUp: string;
  dueOn: (date: string) => string;
  overdue: (date: string) => string;
  noSteps: string;
  yourFiles: string;
  yourAccess: string;
  messages: string;
  dropFiles: string;
  sendAccess: string;
  accessHint: string;
  transmitted: string;
  inProgress: string;
  complete: string;
  submitted: (agency: string) => string;
  reopen: string;
  validated: (agency: string) => string;
  blocked: string;
  askQuestion: string;
  questionPlaceholder: string;
  send: string;
  print: string;
  you: string;
  collapse: string;
  expand: string;
  footerSecurity: (agency: string) => string;
  footerBy: (agency: string) => string;
};

const DICTIONARY: Record<Locale, Strings> = {
  fr: {
    intro: (agency: string) =>
      `${agency} a besoin des éléments ci-dessous pour démarrer. Déposez vos fichiers, transmettez vos accès en sécurité, et cochez au fur et à mesure.`,
    remaining: (count: number) => `${count} point(s) restant(s)`,
    allDone: "Tout est transmis, merci !",
    completedTitle: "Vous avez tout envoyé.",
    completedBody: (agency: string) =>
      `${agency} a reçu vos éléments et revient vers vous. Vous pouvez fermer cette page — elle reste accessible avec le même lien.`,
    nextUp: "À faire maintenant",
    dueOn: (date: string) => `Souhaité pour le ${date}`,
    overdue: (date: string) => `Attendu depuis le ${date}`,
    noSteps: "Aucune étape pour l'instant.",
    yourFiles: "Vos fichiers",
    yourAccess: "Vos accès",
    messages: "Échanges",
    dropFiles: "Déposer des fichiers",
    sendAccess: "Transmettre un accès",
    accessHint:
      "Chiffré à la réception. Ni visible ici ensuite, ni transmis par email.",
    transmitted: "transmis · chiffré",
    inProgress: "Je m'en occupe",
    complete: "C'est complet",
    submitted: (agency: string) =>
      `Transmis à ${agency}, en attente de validation.`,
    reopen: "J'ai un ajout à faire",
    validated: (agency: string) =>
      `${agency} a validé cette étape. Rien de plus à faire.`,
    blocked: "Point de blocage",
    askQuestion: "Poser une question",
    questionPlaceholder: "Une question ? Écrivez ici…",
    send: "Envoyer",
    print: "Imprimer la liste",
    you: "Vous",
    collapse: "réduire",
    expand: "ouvrir",
    footerSecurity: (agency: string) =>
      `Vos fichiers et vos accès ne sont visibles que par ${agency}. Les mots de passe transmis ici sont chiffrés et ne circulent jamais par email.`,
    footerBy: (agency: string) => `Espace fourni par ${agency} · propulsé par Onbo`,
  },
  en: {
    intro: (agency: string) =>
      `${agency} needs the items below to get started. Upload your files, share your credentials securely, and tick things off as you go.`,
    remaining: (count: number) => `${count} item(s) left`,
    allDone: "Everything is in, thank you!",
    completedTitle: "You've sent everything.",
    completedBody: (agency: string) =>
      `${agency} has received your items and will get back to you. You can close this page — the same link still works.`,
    nextUp: "Up next",
    dueOn: (date: string) => `Requested by ${date}`,
    overdue: (date: string) => `Overdue since ${date}`,
    noSteps: "No items yet.",
    yourFiles: "Your files",
    yourAccess: "Your credentials",
    messages: "Messages",
    dropFiles: "Upload files",
    sendAccess: "Share a credential",
    accessHint:
      "Encrypted on arrival. Not visible here afterwards, never sent by email.",
    transmitted: "shared · encrypted",
    inProgress: "I'm on it",
    complete: "This is complete",
    submitted: (agency: string) => `Sent to ${agency}, awaiting review.`,
    reopen: "I need to add something",
    validated: (agency: string) =>
      `${agency} approved this item. Nothing left to do.`,
    blocked: "Blocked",
    askQuestion: "Ask a question",
    questionPlaceholder: "Any question? Write here…",
    send: "Send",
    print: "Print the list",
    you: "You",
    collapse: "collapse",
    expand: "open",
    footerSecurity: (agency: string) =>
      `Your files and credentials are visible to ${agency} only. Passwords shared here are encrypted and never travel by email.`,
    footerBy: (agency: string) => `Space provided by ${agency} · powered by Onbo`,
  },
};

export type Dictionary = Strings;

export function dictionary(locale: Locale): Dictionary {
  return DICTIONARY[locale];
}
