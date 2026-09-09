import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { formatBytes } from "@/server/documents";
import { getPostById } from "@/server/posts";
import { AttachmentForm } from "@/components/admin/AttachmentForm";
import { InlineDelete } from "@/components/admin/InlineAction";
import { PageHeader, SectionHeading } from "@/components/admin/PageHeader";
import { PostEditor, type EditorPost } from "@/components/admin/PostEditor";
import { FlagChip, StatusChip } from "@/components/admin/StatusChip";
import { FileGlyph } from "@/components/admin/Thumb";
import { Notice } from "@/components/ui/primitives";
import { formatDateTime, isInFuture, toISTInputValue } from "../../../_lib/datetime";
import { isUuid } from "../../../_lib/form";
import { param, type SearchParams } from "../../../_lib/params";
import { loadEditorContext } from "../_lib";
import { attachDocumentAction, deletePostAndReturnAction, detachDocumentAction, previewMarkdownAction, savePostAction } from "../actions";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<SearchParams> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const post = isUuid(id) ? await getPostById(id) : null;
  return { title: post ? `Edit · ${post.title}` : "Post not found" };
}

export default async function EditPostPage({ params, searchParams }: Props) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  if (!isUuid(id)) notFound();
  const [post, ctx] = await Promise.all([getPostById(id), loadEditorContext()]);
  if (!post) notFound();

  const saved = param(sp, "saved") === "1";
  const live = post.status === "published" && !isInFuture(post.publishedAt);
  const scheduled = post.status === "published" && !live;

  const editorPost: EditorPost = {
    id: post.id,
    title: post.title,
    slug: post.slug,
    deck: post.deck ?? "",
    excerpt: post.excerpt ?? "",
    bodyMd: post.bodyMd,
    categoryId: post.categoryId,
    authorName: post.authorName,
    authorRole: post.authorRole ?? "",
    status: post.status === "published" ? "published" : "draft",
    publishedAt: toISTInputValue(post.publishedAt),
    featured: post.featured,
    isDemo: post.isDemo,
    heroImageId: post.heroImageId,
    heroImageUrl: post.heroImageUrl,
    heroImageAlt: post.heroImageAlt ?? "",
    tags: post.tags.map((t) => t.name).join(", "),
    heroPreview: post.heroImage
      ? { url: post.heroImage.url, alt: post.heroImage.altText || post.heroImageAlt || "" }
      : post.heroImageUrl
        ? { url: post.heroImageUrl, alt: post.heroImageAlt || "" }
        : null,
  };

  return (
    <div>
      <PageHeader
        eyebrow={
          <span className="inline-flex flex-wrap items-center gap-2">
            Posts · Edit <StatusChip status={post.status} />
            {scheduled ? <FlagChip>Scheduled</FlagChip> : null}
            {post.featured ? <FlagChip tone="bronze">Featured</FlagChip> : null}
            {post.isDemo ? <FlagChip tone="seal">Demo</FlagChip> : null}
          </span>
        }
        title={post.title}
        lede={
          <span className="font-mono text-[0.7rem] not-italic tracking-[0.08em] text-bone">
            /blog/{post.slug} · {post.readingMinutes} min read · created {formatDateTime(post.createdAt)} · last saved {formatDateTime(post.updatedAt)}
          </span>
        }
        actions={
          <>
            <Link href="/admin/posts" className="btn btn-sm btn-ghost">
              Back to the list
            </Link>
            {live ? (
              <Link href={`/blog/${post.slug}`} className="btn btn-sm" target="_blank" rel="noopener">
                View on site
              </Link>
            ) : null}
            <InlineDelete action={deletePostAndReturnAction.bind(null, post.id)} question="Delete the article and its comments?">
              Delete article
            </InlineDelete>
          </>
        }
      />

      {saved ? (
        <Notice tone="success" className="mb-8">
          Saved.{" "}
          {live ? (
            <>
              It is live at{" "}
              <Link href={`/blog/${post.slug}`} className="underline underline-offset-4">
                /blog/{post.slug}
              </Link>
              .
            </>
          ) : scheduled ? (
            <>It will appear on the site at {formatDateTime(post.publishedAt)} IST.</>
          ) : (
            <>It stays a draft until you publish it.</>
          )}
        </Notice>
      ) : null}

      <PostEditor post={editorPost} categories={ctx.categories} images={ctx.images} defaults={ctx.defaults} saveAction={savePostAction} previewAction={previewMarkdownAction} />

      <section className="mt-20" aria-labelledby="attachments-heading">
        <SectionHeading number="02" title={<span id="attachments-heading">Attached documents</span>} aside={`${post.documents.length} attached`} />
        <p className="mb-6 max-w-2xl text-sm text-bone/80">PDFs and Word files listed at the end of the article for readers to download — the full case note, an order, a chart. Attachments save immediately, separately from the article form above.</p>

        {post.documents.length ? (
          <ol className="mb-10 divide-y divide-bronze/15 border-y border-bronze/20">
            {post.documents.map((doc, i) => (
              <li key={doc.id} className="flex flex-wrap items-center gap-4 py-4">
                <span className="font-mono text-[0.66rem] tracking-[0.2em] text-bronze-2" aria-hidden="true">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <FileGlyph label={doc.kind === "pdf" ? "PDF" : "DOC"} size={44} />
                <div className="min-w-0 flex-1">
                  <p className="font-display text-lg leading-snug text-ivory">{doc.label || doc.title || doc.filename}</p>
                  <p className="font-mono text-[0.62rem] tracking-[0.06em] text-ash">
                    {doc.filename} · {formatBytes(doc.sizeBytes)} · {formatDateTime(doc.createdAt)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <a href={doc.url} className="btn btn-sm" target="_blank" rel="noopener">
                    Open
                  </a>
                  <InlineDelete action={detachDocumentAction.bind(null, post.id, doc.id)} question="Remove from this article?" confirmLabel="Remove">
                    Remove
                  </InlineDelete>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mb-10 border-y border-bronze/20 py-6 text-sm text-bone/70">No documents attached yet. The file stays in the library even after you remove it from an article.</p>
        )}

        <div className="max-w-3xl">
          <p className="eyebrow mb-4">Attach a document</p>
          <AttachmentForm action={attachDocumentAction.bind(null, post.id)} library={ctx.attachable} />
        </div>
      </section>
    </div>
  );
}
