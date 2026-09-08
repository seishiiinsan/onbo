import { describe, expect, it } from "vitest";
import { presign, type S3Config } from "@/lib/s3";

const config: S3Config = {
  endpoint: "https://s3.fr-par.scw.cloud",
  region: "fr-par",
  bucket: "onbo-test",
  accessKeyId: "SCWXXXXXXXXXXXXXXXXX",
  secretAccessKey: "secret",
  forcePathStyle: true,
};

describe("URL présignée", () => {
  it("porte les paramètres de signature attendus", () => {
    const url = presign(config, "PUT", "abc123", {
      contentType: "image/png",
      expiresIn: 900,
    });

    expect(url).toContain("/onbo-test/abc123");
    expect(url).toContain("X-Amz-Algorithm=AWS4-HMAC-SHA256");
    expect(url).toContain("X-Amz-Expires=900");
    expect(url).toMatch(/X-Amz-Signature=[0-9a-f]{64}/);
    // Le secret ne doit jamais se retrouver dans l'URL.
    expect(url).not.toContain("secret");
  });

  it("signe différemment deux clés différentes", () => {
    const a = presign(config, "GET", "un");
    const b = presign(config, "GET", "deux");
    expect(a).not.toBe(b);
  });
});
