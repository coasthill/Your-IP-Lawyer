import { afterEach, describe, expect, it } from "vitest";
import { contentFingerprint, decideStatus, spamScore, urlCount } from "./spam";

const originalMode = process.env.MODERATION_MODE;
afterEach(() => {
  if (originalMode === undefined) delete process.env.MODERATION_MODE;
  else process.env.MODERATION_MODE = originalMode;
});

describe("spamScore", () => {
  it("scores clean text as zero", () => {
    expect(spamScore("A thoughtful comment about passing off and goodwill.").score).toBe(0);
  });
  it("holds content with links for moderation", () => {
    const v = spamScore("Read my blog https://example.com");
    expect(v.score).toBeGreaterThanOrEqual(1);
    expect(v.reasons).toContain("contains links");
  });
  it("flags obvious spam", () => {
    const v = spamScore("FREE MONEY casino https://a.com https://b.com https://c.com");
    expect(v.score).toBeGreaterThanOrEqual(3);
  });
  it("flags shouting and repeated characters", () => {
    expect(spamScore("THIS IS ALL CAPITALS AND VERY LOUD INDEED OKAY").reasons).toContain("mostly capital letters");
    expect(spamScore("wowwwwwwwwwwwww").reasons).toContain("repeated characters");
  });
  it("flags links in the name field", () => {
    expect(spamScore("hello there", { name: "http://spam.example" }).reasons).toContain("link in name");
  });
});

describe("decideStatus", () => {
  it("auto mode publishes clean content and holds suspicious content", () => {
    process.env.MODERATION_MODE = "auto";
    expect(decideStatus({ score: 0, reasons: [] })).toBe("approved");
    expect(decideStatus({ score: 1, reasons: [] })).toBe("pending");
    expect(decideStatus({ score: 3, reasons: [] })).toBe("spam");
  });
  it("manual mode holds everything that is not spam", () => {
    process.env.MODERATION_MODE = "manual";
    expect(decideStatus({ score: 0, reasons: [] })).toBe("pending");
    expect(decideStatus({ score: 5, reasons: [] })).toBe("spam");
  });
});

describe("helpers", () => {
  it("counts urls", () => {
    expect(urlCount("http://a.com and https://b.com and www.c.com")).toBe(3);
  });
  it("fingerprints normalised text per visitor", () => {
    expect(contentFingerprint("Hello   World", "ip1")).toBe(contentFingerprint("hello world", "ip1"));
    expect(contentFingerprint("hello world", "ip1")).not.toBe(contentFingerprint("hello world", "ip2"));
  });
});
