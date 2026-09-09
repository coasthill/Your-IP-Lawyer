/**
 * Markdown → sanitised HTML for blog articles (admin-authored, still sanitised).
 * Supports GitHub-flavoured Markdown: tables, footnotes, task lists, strikethrough.
 */
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeRaw from "rehype-raw";
import rehypeSlug from "rehype-slug";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";

const schema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    "*": [...(defaultSchema.attributes?.["*"] ?? []), "className", "id"],
    a: [...(defaultSchema.attributes?.a ?? []), "target", "rel"],
    img: [...(defaultSchema.attributes?.img ?? []), "loading", "width", "height"],
    sup: ["id"],
    li: ["id"],
    section: ["dataFootnotes", "className"],
  },
  tagNames: [...(defaultSchema.tagNames ?? []), "section", "sup", "figure", "figcaption", "mark"],
  clobberPrefix: "",
};

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype, { allowDangerousHtml: true, footnoteLabel: "Notes", footnoteLabelTagName: "h2" })
  .use(rehypeRaw)
  .use(rehypeSlug)
  .use(rehypeSanitize, schema)
  .use(rehypeStringify);

export async function renderMarkdown(md: string): Promise<string> {
  const file = await processor.process(md);
  return String(file);
}

/** Rough reading time in minutes (200 wpm). */
export function readingTime(text: string): number {
  const words = text.replace(/[#*_>`\-\[\]()!]/g, " ").split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

/** Strips markdown to plain text — used for excerpts and search. */
export function markdownToPlain(md: string, max = 280): string {
  const text = md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_`~]/g, "")
    .replace(/\[\^[^\]]*\]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}
