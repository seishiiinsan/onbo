import { createHash, createHmac } from "node:crypto";

/**
 * Client S3 minimal, signature Version 4 (issue #32).
 *
 * Volontairement sans SDK : trois verbes suffisent (PUT, GET, DELETE) plus
 * la signature d'URL presignee. Compatible Scaleway Object Storage et OVH,
 * region UE, comme tout stockage S3-compatible.
 */
export type S3Config = {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  /** Chemin plutot que sous-domaine : utile derriere un stockage local. */
  forcePathStyle: boolean;
};

export function s3Config(): S3Config | null {
  const endpoint = process.env.S3_ENDPOINT;
  const bucket = process.env.S3_BUCKET;
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;

  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) return null;

  return {
    endpoint: endpoint.replace(/\/+$/, ""),
    region: process.env.S3_REGION ?? "fr-par",
    bucket,
    accessKeyId,
    secretAccessKey,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== "false",
  };
}

const SERVICE = "s3";
const UNSIGNED = "UNSIGNED-PAYLOAD";

function sha256(value: string | Buffer) {
  return createHash("sha256").update(value).digest("hex");
}

function hmac(key: Buffer | string, value: string) {
  return createHmac("sha256", key).update(value).digest();
}

function stamps(now: Date) {
  const amz = now.toISOString().replace(/[-:]|\.\d{3}/g, "");
  return { amzDate: amz, dateStamp: amz.slice(0, 8) };
}

function signingKey(config: S3Config, dateStamp: string) {
  return hmac(
    hmac(hmac(hmac(`AWS4${config.secretAccessKey}`, dateStamp), config.region), SERVICE),
    "aws4_request",
  );
}

/** Chaque segment de cle est encode, les "/" restent des separateurs. */
function encodeKey(key: string) {
  return key
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function objectUrl(config: S3Config, key: string) {
  const base = new URL(config.endpoint);
  const path = config.forcePathStyle
    ? `/${config.bucket}/${encodeKey(key)}`
    : `/${encodeKey(key)}`;
  if (!config.forcePathStyle) base.host = `${config.bucket}.${base.host}`;
  return new URL(`${base.origin}${path}`);
}

function canonicalHeaders(headers: Record<string, string>) {
  const entries = Object.entries(headers)
    .map(([name, value]) => [name.toLowerCase(), value.trim()] as const)
    .sort(([a], [b]) => (a < b ? -1 : 1));

  return {
    canonical: entries.map(([name, value]) => `${name}:${value}\n`).join(""),
    signed: entries.map(([name]) => name).join(";"),
  };
}

/** Requete signee dans l'en-tete Authorization (appel serveur a serveur). */
export async function s3Request(
  config: S3Config,
  method: "GET" | "PUT" | "DELETE" | "HEAD",
  key: string,
  options: { body?: Buffer; contentType?: string } = {},
) {
  const url = objectUrl(config, key);
  const now = new Date();
  const { amzDate, dateStamp } = stamps(now);
  const payloadHash = sha256(options.body ?? Buffer.alloc(0));

  const headers: Record<string, string> = {
    host: url.host,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate,
  };
  if (options.contentType) headers["content-type"] = options.contentType;

  const { canonical, signed } = canonicalHeaders(headers);
  const canonicalRequest = [
    method,
    url.pathname,
    "",
    canonical,
    signed,
    payloadHash,
  ].join("\n");

  const scope = `${dateStamp}/${config.region}/${SERVICE}/aws4_request`;
  const toSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    scope,
    sha256(canonicalRequest),
  ].join("\n");

  const signature = createHmac("sha256", signingKey(config, dateStamp))
    .update(toSign)
    .digest("hex");

  return fetch(url, {
    method,
    headers: {
      ...headers,
      authorization: `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${scope}, SignedHeaders=${signed}, Signature=${signature}`,
    },
    // Uint8Array : Buffer n'est pas un BodyInit au sens de fetch.
    body: options.body ? new Uint8Array(options.body) : undefined,
  });
}

/**
 * URL presignee : le navigateur televerse directement vers l'objet, le
 * binaire ne transite plus par l'application.
 */
export function presign(
  config: S3Config,
  method: "GET" | "PUT",
  key: string,
  options: { expiresIn?: number; contentType?: string } = {},
) {
  const url = objectUrl(config, key);
  const now = new Date();
  const { amzDate, dateStamp } = stamps(now);
  const scope = `${dateStamp}/${config.region}/${SERVICE}/aws4_request`;

  const headers: Record<string, string> = { host: url.host };
  if (options.contentType) headers["content-type"] = options.contentType;
  const { canonical, signed } = canonicalHeaders(headers);

  const query = new URLSearchParams({
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": `${config.accessKeyId}/${scope}`,
    "X-Amz-Date": amzDate,
    "X-Amz-Expires": String(options.expiresIn ?? 900),
    "X-Amz-SignedHeaders": signed,
  });
  query.sort();

  const canonicalRequest = [
    method,
    url.pathname,
    query.toString(),
    canonical,
    signed,
    UNSIGNED,
  ].join("\n");

  const toSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    scope,
    sha256(canonicalRequest),
  ].join("\n");

  const signature = createHmac("sha256", signingKey(config, dateStamp))
    .update(toSign)
    .digest("hex");

  query.append("X-Amz-Signature", signature);
  return `${url.origin}${url.pathname}?${query.toString()}`;
}
