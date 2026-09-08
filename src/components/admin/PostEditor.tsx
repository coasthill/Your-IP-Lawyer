"use client";

import { startTransition, useActionState, useId, useState, useTransition, type FormEvent } from "react";
import { slugify } from "@/lib/utils";
import { Notice } from "@/components/ui/primitives";
import { CheckField, FormField, describedBy } from "./FormBits";
import { MarkdownHelp } from "./MarkdownHelp";
import { Thumb } from "./Thumb";
import { idleFormState, type FormState } from "./form-state";

export type EditorPost = {
  id: string;
  title: string;
  slug: string;
  deck: string;
  excerpt: string;
  bodyMd: string;
  categoryId: string | null;
  authorName: string;
  authorRole: string;
  status: "draft" | "published";
  /** IST value for a datetime-local input, or "". */
  publishedAt: string;
  featured: boolean;
  isDemo: boolean;
  heroImageId: string | null;
  heroImageUrl: string | null;
  heroImageAlt: string;
  /** Comma-separated tag names. */
  tags: string;
  heroPreview: { url: string; alt: string } | null;
};

export type EditorCategory = { id: string; name: string };
export type EditorImage = { id: string; url: string; label: string; alt: string };

type HeroMode = "keep" | "none" | "upload" | "library" | "url";

const cls = "w-full";

export function PostEditor({
  post,
  categories,
  images,
  defaults,
  saveAction,
  previewAction,
}: {
  post: EditorPost | null;
  categories: EditorCategory[];
  images: EditorImage[];
  defaults: { authorName: string; authorRole: string; publishedAt: string };
  saveAction: (prev: FormState, formData: FormData) => Promise<FormState>;
  previewAction: (markdown: string) => Promise<{ html: string }>;
}) {
  const [state, formAction, saving] = useActionState(saveAction, idleFormState);
  const uid = useId();
  const id = (name: string) => `${uid}-${name}`;
  const hasHero = Boolean(post?.heroImageId || post?.heroImageUrl);

  const [form, setForm] = useState(() => ({
    title: post?.title ?? "",
    slug: post?.slug ?? "",
    deck: post?.deck ?? "",
    excerpt: post?.excerpt ?? "",
    bodyMd: post?.bodyMd ?? "",
    categoryId: post?.categoryId ?? "",
    tags: post?.tags ?? "",
    authorName: post?.authorName ?? defaults.authorName,
    authorRole: post?.authorRole ?? defaults.authorRole,
    status: post?.status ?? "draft",
    publishedAt: post?.publishedAt || defaults.publishedAt,
    featured: post?.featured ?? false,
    isDemo: post?.isDemo ?? false,
    heroMode: (hasHero ? "keep" : "none") as HeroMode,
    heroDocumentId: post?.heroImageId ?? "",
    heroImageUrl: post?.heroImageUrl ?? "",
    heroImageAlt: post?.heroImageAlt ?? "",
  }));
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }));

  const [tab, setTab] = useState<"write" | "preview">("write");
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewing, startPreview] = useTransition();

  const errors = state.status === "error" ? (state.fieldErrors ?? {}) : {};

  const showPreview = () => {
    startPreview(async () => {
      const res = await previewAction(form.bodyMd);
      setPreviewHtml(res.html);
      setTab("preview");
    });
  };

  /** Submitted through a transition rather than <form action> so a validation error never wipes the draft. */
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => formAction(fd));
  };

  const slugPreview = form.slug.trim() ? slugify(form.slug) : form.title.trim() ? slugify(form.title) : "";
  const selectedLibraryImage = images.find((i) => i.id === form.heroDocumentId) ?? null;
  const wordCount = form.bodyMd.split(/\s+/).filter(Boolean).length;

  return (
    <form method="post" onSubmit={onSubmit} className="space-y-10" noValidate>
      {post ? <input type="hidden" name="id" value={post.id} /> : null}

      {state.status === "error" ? <Notice tone="error">{state.message}</Notice> : null}

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_21rem]">
        {/* ------------------------------------------------ main column */}
        <div className="min-w-0 space-y-8">
          <FormField label="Title" htmlFor={id("title")} required error={errors.title}>
            <input
              id={id("title")}
              name="title"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              className="font-display text-2xl text-ivory md:text-3xl"
              placeholder="The headline"
              aria-invalid={Boolean(errors.title) || undefined}
              aria-describedby={describedBy(id("title"), errors.title)}
              autoComplete="off"
            />
          </FormField>

          <FormField label="Web address (slug)" htmlFor={id("slug")} error={errors.slug} hint={slugPreview ? `Will be published at /blog/${slugPreview}` : "Left empty, it is created from the title."}>
            <input id={id("slug")} name="slug" value={form.slug} onChange={(e) => set("slug", e.target.value)} className="font-mono text-sm" placeholder="auto from title" autoComplete="off" spellCheck={false} />
          </FormField>

          <FormField label="Deck" htmlFor={id("deck")} hint="The one-sentence subtitle under the title.">
            <textarea id={id("deck")} name="deck" rows={2} value={form.deck} onChange={(e) => set("deck", e.target.value)} className="font-display text-lg" />
          </FormField>

          <FormField label="Excerpt" htmlFor={id("excerpt")} hint="Shown on cards and in search results. Left empty, it is taken from the opening of the article.">
            <textarea id={id("excerpt")} name="excerpt" rows={3} value={form.excerpt} onChange={(e) => set("excerpt", e.target.value)} />
          </FormField>

          {/* Body: write / preview */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div role="tablist" aria-label="Article body" className="flex gap-1 border-b border-bronze/20">
                <button
                  type="button"
                  role="tab"
                  id={id("tab-write")}
                  aria-selected={tab === "write"}
                  aria-controls={id("panel-write")}
                  onClick={() => setTab("write")}
                  className={`-mb-px border-b-2 px-3 py-2 font-mono text-[0.66rem] uppercase tracking-[0.18em] ${tab === "write" ? "border-bronze-2 text-ivory" : "border-transparent text-bone hover:text-ivory"}`}
                >
                  Write
                </button>
                <button
                  type="button"
                  role="tab"
                  id={id("tab-preview")}
                  aria-selected={tab === "preview"}
                  aria-controls={id("panel-preview")}
                  onClick={showPreview}
                  disabled={previewing}
                  className={`-mb-px border-b-2 px-3 py-2 font-mono text-[0.66rem] uppercase tracking-[0.18em] ${tab === "preview" ? "border-bronze-2 text-ivory" : "border-transparent text-bone hover:text-ivory"}`}
                >
                  {previewing ? "Rendering…" : "Preview"}
                </button>
              </div>
              <p className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-ash">
                {wordCount} words · ~{Math.max(1, Math.round(wordCount / 200))} min read
              </p>
            </div>

            <div id={id("panel-write")} role="tabpanel" aria-labelledby={id("tab-write")} hidden={tab !== "write"}>
              <label htmlFor={id("body")} className="sr-only">
                Body (Markdown)
              </label>
              <textarea
                id={id("body")}
                name="bodyMd"
                value={form.bodyMd}
                onChange={(e) => set("bodyMd", e.target.value)}
                className={`${cls} min-h-[60vh] resize-y font-mono text-[0.86rem] leading-relaxed`}
                placeholder={"Write in Markdown.\n\n## A heading\n\nThe argument, in prose."}
                spellCheck
                aria-invalid={Boolean(errors.bodyMd) || undefined}
                aria-describedby={errors.bodyMd ? id("body-error") : undefined}
              />
              {errors.bodyMd ? (
                <p id={id("body-error")} className="mt-2 text-xs text-seal-2" role="alert">
                  {errors.bodyMd}
                </p>
              ) : null}
            </div>

            <div id={id("panel-preview")} role="tabpanel" aria-labelledby={id("tab-preview")} hidden={tab !== "preview"}>
              {/* Keep the Markdown in the request even while the textarea is hidden. */}
              {tab === "preview" ? <input type="hidden" name="bodyMd" value={form.bodyMd} /> : null}
              <div className="paper relative grain px-6 py-10 md:px-12 md:py-14">
                <div className="relative z-10 mx-auto max-w-[var(--measure)]">
                  <p className="eyebrow mb-6">Preview · as it will be published</p>
                  {previewHtml && previewHtml.trim() ? (
                    <div className="prose-editorial" dangerouslySetInnerHTML={{ __html: previewHtml }} />
                  ) : (
                    <p className="font-display text-xl italic opacity-60">Nothing here yet. Start the argument.</p>
                  )}
                </div>
              </div>
            </div>

            <MarkdownHelp />
          </div>
        </div>

        {/* ------------------------------------------------ rail */}
        <aside className="space-y-8 lg:border-l lg:border-bronze/15 lg:pl-8">
          <div className="space-y-5">
            <p className="eyebrow">Filing</p>
            <FormField label="Status" htmlFor={id("status")}>
              <select id={id("status")} name="status" value={form.status} onChange={(e) => set("status", e.target.value as "draft" | "published")}>
                <option value="draft">Draft — only you can see it</option>
                <option value="published">Published — live on the site</option>
              </select>
            </FormField>
            <FormField label="Publish date (IST)" htmlFor={id("publishedAt")} error={errors.publishedAt} hint="Future dates keep the article hidden until then.">
              <input id={id("publishedAt")} name="publishedAt" type="datetime-local" value={form.publishedAt} onChange={(e) => set("publishedAt", e.target.value)} className="font-mono text-sm" aria-invalid={Boolean(errors.publishedAt) || undefined} aria-describedby={describedBy(id("publishedAt"), errors.publishedAt, true)} />
            </FormField>
            <CheckField id={id("featured")} name="featured" label="Featured" hint="Leads the blog and the homepage. Only one article at a time." checked={form.featured} onChange={(v) => set("featured", v)} />
            <CheckField id={id("isDemo")} name="isDemo" label="Demo content" hint="Shows a “Demo content” label to readers." checked={form.isDemo} onChange={(v) => set("isDemo", v)} />
          </div>

          <div className="rule-solid" role="presentation" />

          <div className="space-y-5">
            <p className="eyebrow">Classification</p>
            <FormField label="Category" htmlFor={id("categoryId")} error={errors.categoryId}>
              <select id={id("categoryId")} name="categoryId" value={form.categoryId} onChange={(e) => set("categoryId", e.target.value)} aria-invalid={Boolean(errors.categoryId) || undefined}>
                <option value="">— none —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Tags" htmlFor={id("tags")} hint="Comma-separated, up to eight.">
              <input id={id("tags")} name="tags" value={form.tags} onChange={(e) => set("tags", e.target.value)} placeholder="passing off, interim injunction" autoComplete="off" />
            </FormField>
          </div>

          <div className="rule-solid" role="presentation" />

          <div className="space-y-5">
            <p className="eyebrow">Byline</p>
            <FormField label="Author" htmlFor={id("authorName")}>
              <input id={id("authorName")} name="authorName" value={form.authorName} onChange={(e) => set("authorName", e.target.value)} />
            </FormField>
            <FormField label="Author role" htmlFor={id("authorRole")}>
              <input id={id("authorRole")} name="authorRole" value={form.authorRole} onChange={(e) => set("authorRole", e.target.value)} placeholder="IP Litigation Lawyer, Delhi" />
            </FormField>
          </div>

          <div className="rule-solid" role="presentation" />

          <fieldset className="space-y-4">
            <legend className="eyebrow mb-4">Feature image</legend>
            {post?.heroPreview ? (
              <div className="flex items-center gap-3">
                <Thumb src={post.heroPreview.url} alt={post.heroPreview.alt || "Current feature image"} size={64} />
                <p className="text-xs text-bone/70">Current image{post.heroPreview.alt ? `: “${post.heroPreview.alt}”` : ""}</p>
              </div>
            ) : null}
            <div className="space-y-2" role="radiogroup" aria-label="Image source">
              {(
                [
                  ...(hasHero ? ([["keep", "Keep the current image"]] as const) : []),
                  ["none", "No feature image"],
                  ["upload", "Upload a new image"],
                  ["library", "Pick from the documents library"],
                  ["url", "Paste an image address"],
                ] as ReadonlyArray<readonly [HeroMode, string]>
              ).map(([mode, label]) => (
                <label key={mode} className="flex items-center gap-3 text-sm text-parchment">
                  <input type="radio" name="heroMode" value={mode} checked={form.heroMode === mode} onChange={() => set("heroMode", mode)} className="h-4 w-4 accent-bronze-2" />
                  {label}
                </label>
              ))}
            </div>

            {form.heroMode === "upload" ? (
              <FormField label="Image file" htmlFor={id("heroFile")} error={errors.heroFile} hint="JPG, PNG, WebP, AVIF or GIF up to 6 MB.">
                <input id={id("heroFile")} name="heroFile" type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/gif" className="text-sm file:mr-3 file:border file:border-bronze/40 file:bg-transparent file:px-3 file:py-1.5 file:font-mono file:text-[0.62rem] file:uppercase file:tracking-[0.16em] file:text-ivory" aria-invalid={Boolean(errors.heroFile) || undefined} />
              </FormField>
            ) : null}

            {form.heroMode === "library" ? (
              <FormField label="Library image" htmlFor={id("heroDocumentId")} error={errors.heroDocumentId} hint={images.length ? undefined : "The library has no images yet — upload one under Documents."}>
                <select id={id("heroDocumentId")} name="heroDocumentId" value={form.heroDocumentId} onChange={(e) => set("heroDocumentId", e.target.value)} aria-invalid={Boolean(errors.heroDocumentId) || undefined}>
                  <option value="">— choose —</option>
                  {images.map((img) => (
                    <option key={img.id} value={img.id}>
                      {img.label}
                    </option>
                  ))}
                </select>
                {selectedLibraryImage ? (
                  <div className="mt-2 flex items-center gap-3">
                    <Thumb src={selectedLibraryImage.url} alt={selectedLibraryImage.alt || selectedLibraryImage.label} size={64} />
                    <p className="text-xs text-bone/70">{selectedLibraryImage.label}</p>
                  </div>
                ) : null}
              </FormField>
            ) : null}

            {form.heroMode === "url" ? (
              <FormField label="Image address" htmlFor={id("heroImageUrl")} error={errors.heroImageUrl} hint="A full https:// address of an image you have the right to use.">
                <input id={id("heroImageUrl")} name="heroImageUrl" type="url" value={form.heroImageUrl} onChange={(e) => set("heroImageUrl", e.target.value)} className="font-mono text-sm" placeholder="https://…" aria-invalid={Boolean(errors.heroImageUrl) || undefined} />
              </FormField>
            ) : null}

            {form.heroMode !== "none" ? (
              <FormField label="Alt text" htmlFor={id("heroImageAlt")} required error={errors.heroImageAlt} hint="A short description for readers who cannot see the image.">
                <input id={id("heroImageAlt")} name="heroImageAlt" value={form.heroImageAlt} onChange={(e) => set("heroImageAlt", e.target.value)} aria-invalid={Boolean(errors.heroImageAlt) || undefined} />
              </FormField>
            ) : null}
          </fieldset>
        </aside>
      </div>

      {/* ------------------------------------------------ action bar */}
      <div className="sticky bottom-0 z-20 -mx-[var(--page-x)] border-t border-bronze/20 bg-ink px-[var(--page-x)] py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-ash" aria-live="polite">
            {saving ? "Saving…" : state.status === "error" ? "Not saved — see the notes above." : form.status === "published" ? "Will be live on save." : "Saved as a draft on save."}
          </p>
          <div className="flex items-center gap-2">
            <button type="button" className="btn btn-sm" onClick={showPreview} disabled={previewing}>
              {previewing ? "Rendering…" : "Preview"}
            </button>
            <button type="submit" className="btn btn-solid btn-sm" disabled={saving} aria-busy={saving || undefined}>
              {saving ? "Saving…" : post ? "Save changes" : "Save article"}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
