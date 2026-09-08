import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export const SESSION_COOKIE = "onbo_session";

const LOGIN_TOKEN_TTL_MIN = 15;
const SESSION_TTL_DAYS = 30;

/** Les tokens ne sont jamais stockes en clair : seul le SHA-256 va en base. */
function hash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function newToken() {
  return randomBytes(32).toString("base64url");
}

export function safeEqual(a: string, b: string) {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

/** Cree un lien magique a usage unique pour cet email. Retourne le token brut. */
export async function createLoginToken(email: string) {
  const token = newToken();
  await prisma.loginToken.create({
    data: {
      tokenHash: hash(token),
      email: email.toLowerCase().trim(),
      expiresAt: new Date(Date.now() + LOGIN_TOKEN_TTL_MIN * 60_000),
    },
  });
  return token;
}

/**
 * Consomme un lien magique : cree l'utilisateur au besoin, ouvre une session.
 * Retourne null si le token est inconnu, expire ou deja utilise.
 */
export async function consumeLoginToken(token: string) {
  const record = await prisma.loginToken.findUnique({
    where: { tokenHash: hash(token) },
  });

  if (!record || record.usedAt || record.expiresAt < new Date()) return null;

  await prisma.loginToken.update({
    where: { id: record.id },
    data: { usedAt: new Date() },
  });

  const user = await prisma.user.upsert({
    where: { email: record.email },
    update: {},
    create: { email: record.email },
  });

  return createSession(user.id);
}

/**
 * Ouvre une session et retourne le cookie a poser.
 *
 * Le cookie n'est pas ecrit ici : dans un Route Handler qui renvoie une
 * redirection, les mutations via cookies() ne sont pas reprises par la
 * reponse. L'appelant pose le cookie sur SA reponse (cf. sessionCookie).
 */
export async function createSession(userId: string) {
  const token = newToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 86_400_000);

  await prisma.session.create({
    data: { tokenHash: hash(token), userId, expiresAt },
  });

  return { userId, token, expiresAt };
}

/**
 * Options du cookie de session, partagees entre tous les points d'ecriture.
 *
 * secure inconditionnel depuis le passage en HTTPS (issue #30). Les
 * navigateurs considerent http://localhost comme un contexte securise : le
 * developpement local n'est pas gene.
 */
export function sessionCookie(token: string, expiresAt: Date) {
  return {
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure: true,
    sameSite: "lax" as const,
    path: "/",
    expires: expiresAt,
  };
}

/** Utilisateur connecte, ou null. */
export async function getCurrentUser() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: hash(token) },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date()) return null;
  return session.user;
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.session
      .delete({ where: { tokenHash: hash(token) } })
      .catch(() => undefined);
  }
  jar.delete(SESSION_COOKIE);
}
