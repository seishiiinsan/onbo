/**
 * Client S3 minimal partage par les scripts (issues #31 et #32).
 *
 * Signature V4 a la main, comme cote application : les scripts n'ont ainsi
 * aucune dependance a installer dans le conteneur.
 */
import { createHash, createHmac } from "node:crypto";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const hmac = (key, value) => createHmac("sha256", key).update(value).digest();

/** prefix = "S3" ou "BACKUP_S3" : deux stockages distincts, meme code. */
export function configFromEnv(prefix = "S3") {
  const endpoint = process.env[`${prefix}_ENDPOINT`];
  const bucket = process.env[`${prefix}_BUCKET`];
  const accessKeyId = process.env[`${prefix}_ACCESS_KEY_ID`];
  const secretAccessKey = process.env[`${prefix}_SECRET_ACCESS_KEY`];
  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) return null;

  return {
    endpoint: endpoint.replace(/\/+$/, ""),
    region: process.env[`${prefix}_REGION`] ?? "fr-par",
    bucket,
    accessKeyId,
    secretAccessKey,
    forcePathStyle: process.env[`${prefix}_FORCE_PATH_STYLE`] !== "false",
  };
}

function urlFor(config, key) {
  const base = new URL(config.endpoint);
  if (!config.forcePathStyle) base.host = `${config.bucket}.${base.host}`;
  const encoded = key.split("/").map(encodeURIComponent).join("/");
  const path = config.forcePathStyle
    ? `/${config.bucket}/${encoded}`
    : `/${encoded}`;
  return new URL(`${base.origin}${path}`);
}

function sign(config, method, url, query, payloadHash, extraHeaders = {}) {
  const amzDate = new Date().toISOString().replace(/[-:]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);

  const headers = {
    host: url.host,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate,
    ...extraHeaders,
  };

  const entries = Object.entries(headers)
    .map(([n, v]) => [n.toLowerCase(), String(v).trim()])
    .sort(([a], [b]) => (a < b ? -1 : 1));
  const canonical = entries.map(([n, v]) => `${n}:${v}\n`).join("");
  const signed = entries.map(([n]) => n).join(";");

  const canonicalRequest = [
    method,
    url.pathname,
    query,
    canonical,
    signed,
    payloadHash,
  ].join("\n");

  const scope = `${dateStamp}/${config.region}/s3/aws4_request`;
  const toSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    scope,
    sha256(canonicalRequest),
  ].join("\n");

  const key = hmac(
    hmac(hmac(hmac(`AWS4${config.secretAccessKey}`, dateStamp), config.region), "s3"),
    "aws4_request",
  );
  const signature = createHmac("sha256", key).update(toSign).digest("hex");

  return {
    ...headers,
    authorization: `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${scope}, SignedHeaders=${signed}, Signature=${signature}`,
  };
}

export async function putObject(config, key, body, contentType = "application/octet-stream") {
  const url = urlFor(config, key);
  const headers = sign(config, "PUT", url, "", sha256(body), {
    "content-type": contentType,
  });
  return fetch(url, { method: "PUT", headers, body: new Uint8Array(body) });
}

export async function getObject(config, key) {
  const url = urlFor(config, key);
  const headers = sign(config, "GET", url, "", sha256(Buffer.alloc(0)));
  return fetch(url, { method: "GET", headers });
}

export async function deleteObject(config, key) {
  const url = urlFor(config, key);
  const headers = sign(config, "DELETE", url, "", sha256(Buffer.alloc(0)));
  return fetch(url, { method: "DELETE", headers });
}

/** Liste les cles d'un prefixe (API v2, pagination suivie jusqu'au bout). */
export async function listObjects(config, prefix) {
  const keys = [];
  let token = null;

  do {
    const base = urlFor(config, "");
    const params = new URLSearchParams({ "list-type": "2", prefix });
    if (token) params.set("continuation-token", token);
    params.sort();

    const url = new URL(
      `${base.origin}${base.pathname.replace(/\/$/, "")}/?${params.toString()}`,
    );
    const listUrl = new URL(url.origin + url.pathname);
    const headers = sign(
      config,
      "GET",
      listUrl,
      params.toString(),
      sha256(Buffer.alloc(0)),
    );

    const response = await fetch(url, { method: "GET", headers });
    if (!response.ok) {
      throw new Error(`Listing impossible (HTTP ${response.status}).`);
    }

    const xml = await response.text();
    for (const match of xml.matchAll(/<Key>([^<]+)<\/Key>/g)) keys.push(match[1]);

    const next = xml.match(/<NextContinuationToken>([^<]+)</);
    token = xml.includes("<IsTruncated>true</IsTruncated>") && next ? next[1] : null;
  } while (token);

  return keys;
}
