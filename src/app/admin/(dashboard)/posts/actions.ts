"use server";

import { redirect } from "next/navigation";
import { siteConfig } from "@/config/site";
import { assertAdmin } from "@/lib/auth/guard";
import { renderMarkdown } from "@/lib/markdown";
import { attachDocumentToPost, deletePost, detachDocumentFromPost, getPostById, savePost, setPostStatus, type PostInput } from "@/server/posts";
import { getDocument, storeUpload } from "@/server/documents";
import { revalidateContent } from "@/server/revalidate";
import { listCategories } from "@/server/taxonomy";
import type { FormState } from "@/components/admin/form-state";
import { fromISTInputValue } from "../../_lib/datetime";
import { errorMessage, field, fileField, flag, isUuid, oneOf, safeHttpUrl, textField } from "../../_lib/form";
import { revalidateAdmin } from "../../_lib/revalidate";

function done(slugs: Array<string | null | undefined> = []) {
  revalidateContent(["/admin", "/admin/posts", ...slugs.filter((s): s is string => Boolean(s)).map((s) => `/blog/${s}`)]);
  revalidateAdmin();
}

/* ---------------- Editor ---------------- */

const HERO_MODES = ["none", "keep", "upload", "library", "url"] as const;

export async function savePostAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await assertAdmin();

  const id = field(formData, "id", 64);
  const existing = id ? (isUuid(id) ? await getPostById(id) : null) : null;
  if (id && !existing) return { status: "error", message: "That article no longer exists. It may have been deleted in another tab." };

  const fieldErrors: Record<string, string> = {};
  const title = field(formData, "title", 200);
  const slug = field(formData, "slug", 120);
  const deck = field(formData, "deck", 400);
  const excerpt = field(formData, "excerpt", 600);
  const bodyMd = textField(formData, "bodyMd");
  const authorName = field(formData, "authorName", 120) || siteConfig.author.name;
  const authorRole = field(formData, "authorRole", 120);
  const status = oneOf(formData.get("status"), ["draft", "published"] as const, "draft");
  const publishedAtRaw = field(formData, "publishedAt", 40);
  const featured = flag(formData, "featured");
  const isDemo = flag(formData, "isDemo");
  const tags = field(formData, "tags", 400);
  const categoryRaw = field(formData, "categoryId", 64);
  const heroMode = oneOf(formData.get("heroMode"), HERO_MODES, existing?.heroImageId ? "keep" : existing?.heroImageUrl ? "url" : "none");
  const heroAlt = field(formData, "heroImageAlt", 300);

  if (title.length < 3) fieldErrors.title = "Give the article a title (at least 3 characters).";
  if (!bodyMd.trim()) fieldErrors.bodyMd = "The article needs a body. Nothing here yet — start the argument.";

  let publishedAt: Date | null = null;
  if (publishedAtRaw) {
    publishedAt = fromISTInputValue(publishedAtRaw);
    if (!publishedAt) fieldErrors.publishedAt = "That date could not be read. Use the date picker.";
  }

  let categoryId: string | null = null;
  if (categoryRaw) {
    const cats = await listCategories("blog");
    const cat = cats.find((c) => c.id === categoryRaw);
    if (!cat) fieldErrors.categoryId = "Choose a category from the list.";
    else categoryId = cat.id;
  }

  // Hero image: keep / upload / library / url / none.
  let heroImageId: string | null = null;
  let heroImageUrl: string | null = null;
  if (heroMode === "keep") {
    heroImageId = existing?.heroImageId ?? null;
    heroImageUrl = existing?.heroImageUrl ?? null;
  } else if (heroMode === "upload") {
    const file = fileField(formData, "heroFile");
    if (file) {
      const stored = await storeUpload(file, ["image"], { uploadedBy: admin.id, title: title || file.name, altText: heroAlt || null });
      if (!stored.ok) fieldErrors.heroFile = stored.error;
      else heroImageId = stored.document.id;
    } else if (existing?.heroImageId) {
      heroImageId = existing.heroImageId;
    } else {
      fieldErrors.heroFile = "Choose an image file to upload, or pick another source.";
    }
  } else if (heroMode === "library") {
    const docId = field(formData, "heroDocumentId", 64);
    const doc = isUuid(docId) ? await getDocument(docId) : null;
    if (!doc || doc.kind !== "image") fieldErrors.heroDocumentId = "Pick an image from the library.";
    else heroImageId = doc.id;
  } else if (heroMode === "url") {
    const url = safeHttpUrl(field(formData, "heroImageUrl", 1000));
    if (!url) fieldErrors.heroImageUrl = "Paste a full http(s) image address.";
    else heroImageUrl = url;
  }
  if ((heroImageId || heroImageUrl) && !heroAlt) fieldErrors.heroImageAlt = "Describe the image in a few words (alt text) for readers who cannot see it.";

  if (Object.keys(fieldErrors).length) {
    return { status: "error", message: "A few fields need attention before this can be saved.", fieldErrors };
  }

  const input: PostInput = {
    id: existing?.id,
    title,
    slug: slug || undefined,
    deck: deck || null,
    excerpt,
    bodyMd,
    categoryId,
    authorName,
    authorRole: authorRole || null,
    status,
    publishedAt,
    featured,
    isDemo,
    heroImageId,
    heroImageUrl,
    heroImageAlt: heroImageId || heroImageUrl ? heroAlt : null,
    tags,
  };

  let savedId: string;
  let savedSlug: string;
  try {
    const post = await savePost(input);
    savedId = post.id;
    savedSlug = post.slug;
  } catch (err) {
    return { status: "error", message: `Could not save the article: ${errorMessage(err)}` };
  }
  done([savedSlug, existing?.slug]);
  redirect(`/admin/posts/${savedId}?saved=1`);
}

/** Renders Markdown for the editor's preview pane. Same sanitised pipeline as publishing. */
export async function previewMarkdownAction(markdown: string): Promise<{ html: string }> {
  await assertAdmin();
  const md = typeof markdown === "string" ? markdown.slice(0, 400_000) : "";
  return { html: await renderMarkdown(md) };
}

/* ---------------- Attachments ---------------- */

export async function attachDocumentAction(postId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await assertAdmin();
  const post = isUuid(postId) ? await getPostById(postId) : null;
  if (!post) return { status: "error", message: "That article no longer exists." };

  const label = field(formData, "label", 120);
  const source = oneOf(formData.get("source"), ["upload", "library"] as const, "upload");
  let documentId: string;

  if (source === "library") {
    const docId = field(formData, "documentId", 64);
    const doc = isUuid(docId) ? await getDocument(docId) : null;
    if (!doc || doc.kind === "image") return { status: "error", message: "Pick a PDF or Word document from the library.", values: { label } };
    documentId = doc.id;
  } else {
    const file = fileField(formData, "file");
    if (!file) return { status: "error", message: "Choose a PDF or Word file to upload.", values: { label } };
    let stored: Awaited<ReturnType<typeof storeUpload>>;
    try {
      stored = await storeUpload(file, ["pdf", "file"], { uploadedBy: admin.id, title: label || file.name });
    } catch (err) {
      return { status: "error", message: `Upload failed: ${errorMessage(err)}`, values: { label } };
    }
    if (!stored.ok) return { status: "error", message: stored.error, values: { label } };
    documentId = stored.document.id;
  }

  if (post.documents.some((d) => d.id === documentId)) {
    return { status: "error", message: "That document is already attached to this article.", values: { label } };
  }
  await attachDocumentToPost(post.id, documentId, label || null);
  done([post.slug]);
  return { status: "success", message: "Attached. Readers will find it at the end of the article." };
}

export async function detachDocumentAction(postId: string, documentId: string): Promise<void> {
  await assertAdmin();
  if (!isUuid(postId) || !isUuid(documentId)) return;
  const post = await getPostById(postId);
  if (!post) return;
  await detachDocumentFromPost(post.id, documentId);
  done([post.slug]);
}

/* ---------------- List actions ---------------- */

export async function publishPostAction(id: string): Promise<void> {
  await assertAdmin();
  const post = isUuid(id) ? await getPostById(id) : null;
  if (!post) return;
  await setPostStatus(post.id, "published");
  done([post.slug]);
}

export async function unpublishPostAction(id: string): Promise<void> {
  await assertAdmin();
  const post = isUuid(id) ? await getPostById(id) : null;
  if (!post) return;
  await setPostStatus(post.id, "draft");
  done([post.slug]);
}

export async function setFeaturedAction(id: string, featured: boolean): Promise<void> {
  await assertAdmin();
  const post = isUuid(id) ? await getPostById(id) : null;
  if (!post) return;
  await savePost({
    id: post.id,
    title: post.title,
    slug: post.slug,
    deck: post.deck,
    excerpt: post.excerpt,
    bodyMd: post.bodyMd,
    categoryId: post.categoryId,
    authorName: post.authorName,
    authorRole: post.authorRole,
    status: post.status === "published" ? "published" : "draft",
    publishedAt: post.publishedAt,
    featured: Boolean(featured),
    isDemo: post.isDemo,
    heroImageId: post.heroImageId,
    heroImageUrl: post.heroImageUrl,
    heroImageAlt: post.heroImageAlt,
  });
  done([post.slug]);
}

export async function deletePostAction(id: string): Promise<void> {
  await assertAdmin();
  const post = isUuid(id) ? await getPostById(id) : null;
  if (!post) return;
  await deletePost(post.id);
  done([post.slug]);
}

/** Delete from inside the editor: afterwards, return to the list. */
export async function deletePostAndReturnAction(id: string): Promise<void> {
  await deletePostAction(id);
  redirect("/admin/posts?deleted=1");
}
