import { describe, expect, it } from "vitest";
import { isStale, progressOf, STALE_DAYS } from "@/lib/progress";

describe("avancement", () => {
  it("compte une étape validée pour 1 et une soumise pour 0,5", () => {
    expect(progressOf([{ status: "VALIDATED" }, { status: "PENDING" }])).toBe(
      50,
    );
    expect(progressOf([{ status: "SUBMITTED" }, { status: "SUBMITTED" }])).toBe(
      50,
    );
  });

  it("ignore les étapes optionnelles", () => {
    // Une étape optionnelle non faite ne doit pas empêcher d'atteindre 100 %.
    expect(
      progressOf([
        { status: "VALIDATED" },
        { status: "PENDING", required: false },
      ]),
    ).toBe(100);
  });

  it("rend 0 quand il n'y a rien à compter", () => {
    expect(progressOf([])).toBe(0);
    expect(progressOf([{ status: "VALIDATED", required: false }])).toBe(0);
  });
});

describe("étape bloquée", () => {
  const jours = (n: number) => new Date(Date.now() - n * 86_400_000);

  it("signale une étape immobile depuis trop longtemps", () => {
    expect(
      isStale({ status: "PENDING", updatedAt: jours(STALE_DAYS + 1) }),
    ).toBe(true);
  });

  it("ne signale ni les étapes soumises ni les validées", () => {
    expect(
      isStale({ status: "SUBMITTED", updatedAt: jours(STALE_DAYS + 10) }),
    ).toBe(false);
    expect(
      isStale({ status: "VALIDATED", updatedAt: jours(STALE_DAYS + 10) }),
    ).toBe(false);
  });
});
