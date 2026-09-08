import { siteConfig } from "@/config/site";
import type { Document } from "@/db/schema";
import { listDocuments } from "@/server/documents";
import { listCategories } from "@/server/taxonomy";
import type { EditorCategory, EditorImage } from "@/components/admin/PostEditor";
import type { AttachableDoc } from "@/components/admin/AttachmentForm";
import { toISTInputValue } from "../../_lib/datetime";

/** Everything the editor needs besides the post itself. */
export async function loadEditorContext(): Promise<{ categories: EditorCategory[]; images: EditorImage[]; attachable: AttachableDoc[]; defaults: { authorName: string; authorRole: string; publishedAt: string } }> {
  const [cats, docs] = await Promise.all([listCategories("blog"), listDocuments()]);
  return {
    categories: cats.map((c) => ({ id: c.id, name: c.name })),
    images: docs.filter((d) => d.kind === "image").map((d) => ({ id: d.id, url: d.url, label: docLabel(d), alt: d.altText ?? "" })),
    attachable: docs.filter((d) => d.kind !== "image").map((d) => ({ id: d.id, label: docLabel(d) })),
    defaults: {
      authorName: siteConfig.author.name,
      authorRole: `${siteConfig.author.title}, ${siteConfig.author.location.split(",")[0].trim()}`,
      publishedAt: toISTInputValue(new Date()),
    },
  };
}

export function docLabel(d: Pick<Document, "title" | "filename">): string {
  return d.title && d.title !== d.filename ? `${d.title} (${d.filename})` : d.filename;
}
