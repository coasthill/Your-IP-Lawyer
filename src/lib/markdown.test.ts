import { describe, expect, it } from "vitest";
import { markdownToPlain, readingTime, renderMarkdown } from "./markdown";

describe("renderMarkdown", () => {
  it("renders GFM with footnotes and tables, sanitised", async () => {
    const html = await renderMarkdown("# Title\n\nSome text[^1] and a table:\n\n| a | b |\n| - | - |\n| 1 | 2 |\n\n[^1]: Note.");
    expect(html).toContain("<h1");
    expect(html).toContain("<table>");
    expect(html).toContain("data-footnotes");
    expect(html).toContain("Note.");
  });
  it("strips scripts and event handlers from raw HTML", async () => {
    const html = await renderMarkdown('Hello <script>alert(1)</script><img src=x onerror="alert(1)"><a href="javascript:alert(1)">x</a>');
    expect(html).not.toContain("<script");
    expect(html).not.toContain("onerror");
    expect(html).not.toContain("javascript:");
  });
  it("adds ids to headings for anchors", async () => {
    const html = await renderMarkdown("## The Classical Trinity");
    expect(html).toContain('id="the-classical-trinity"');
  });
});

describe("text helpers", () => {
  it("estimates reading time", () => {
    expect(readingTime("word ".repeat(400))).toBe(2);
    expect(readingTime("short")).toBe(1);
  });
  it("turns markdown into a plain excerpt", () => {
    expect(markdownToPlain("# Heading\n\nSome **bold** text with a [link](https://x.y).")).toBe("Heading Some bold text with a link.");
    expect(markdownToPlain("x ".repeat(300), 40).endsWith("…")).toBe(true);
  });
});
