/**
 * Logs structures (issue #35).
 *
 * Une ligne JSON par evenement, lisible par un agrégateur sans regex. Deux
 * regles : jamais de secret, jamais de donnee personnelle en clair — une
 * adresse email est reduite a son domaine et a une empreinte courte.
 */
import { createHash } from "node:crypto";

export type Level = "debug" | "info" | "warn" | "error";

const LEVELS: Record<Level, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function threshold() {
  const configured = (process.env.LOG_LEVEL ?? "info").toLowerCase() as Level;
  return LEVELS[configured] ?? LEVELS.info;
}

/** Cles dont la valeur ne doit jamais sortir en clair. */
const SECRET_KEYS = new Set([
  "password",
  "secret",
  "token",
  "authorization",
  "cookie",
  "apiKey",
  "key",
]);

export function maskEmail(value: string) {
  const at = value.lastIndexOf("@");
  const hash = createHash("sha256").update(value).digest("hex").slice(0, 8);
  return at < 0 ? `#${hash}` : `#${hash}@${value.slice(at + 1)}`;
}

function scrub(value: unknown, key?: string): unknown {
  if (key && SECRET_KEYS.has(key)) return "[masqué]";
  if (typeof value === "string") {
    return value.includes("@") && value.length < 320 ? maskEmail(value) : value;
  }
  if (Array.isArray(value)) return value.map((item) => scrub(item));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([name, item]) => [
        name,
        scrub(item, name),
      ]),
    );
  }
  return value;
}

export function log(
  level: Level,
  message: string,
  fields: Record<string, unknown> = {},
) {
  if (LEVELS[level] < threshold()) return;

  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    msg: message,
    ...(scrub(fields) as Record<string, unknown>),
  });

  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  debug: (message: string, fields?: Record<string, unknown>) =>
    log("debug", message, fields),
  info: (message: string, fields?: Record<string, unknown>) =>
    log("info", message, fields),
  warn: (message: string, fields?: Record<string, unknown>) =>
    log("warn", message, fields),
  error: (message: string, fields?: Record<string, unknown>) =>
    log("error", message, fields),
};
