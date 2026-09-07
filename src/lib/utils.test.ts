import { describe, expect, it } from "vitest";
import { displayName, pluralise, slugify } from "./utils";

describe("slugify", () => {
  it("produces clean URL slugs", () => {
    expect(slugify("Passing Off and the Problem of Similarity")).toBe("passing-off-and-the-problem-of-similarity");
    expect(slugify("  Trade Marks & Designs: 2026!  ")).toBe("trade-marks-and-designs-2026");
    expect(slugify("Café Résumé")).toBe("cafe-resume");
  });
  it("never returns an empty slug", () => {
    expect(slugify("???")).toBe("untitled");
  });
  it("caps length", () => {
    expect(slugify("a".repeat(200)).length).toBeLessThanOrEqual(90);
  });
});

describe("display helpers", () => {
  it("falls back to Guest Contributor", () => {
    expect(displayName("")).toBe("Guest Contributor");
    expect(displayName("  ")).toBe("Guest Contributor");
    expect(displayName("Rohit")).toBe("Rohit");
  });
  it("pluralises", () => {
    expect(pluralise(1, "reply", "replies")).toBe("1 reply");
    expect(pluralise(3, "reply", "replies")).toBe("3 replies");
  });
});
