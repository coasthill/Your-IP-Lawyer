import Image from "next/image";
import Link from "next/link";
import type { PostWithMeta } from "@/server/posts";
import { cn, formatDate, formatDateShort } from "@/lib/utils";
import { Arrow, DemoBadge } from "@/components/ui/primitives";
import { articlePath, readingLabel, resolveHeroImage } from "./format";

export type PostCardVariant = "featured" | "standard" | "compact";

export type PostCardProps = {
  post: PostWithMeta;
  variant?: PostCardVariant;
  /** Preload the hero image (use for the lead article above the fold). */
  priority?: boolean;
};

/*
 * The card is context-agnostic: it reads `currentColor` so it sits on the dark masthead
 * and on `.paper` alike. The whole card is one link (stretched from the title); hovering
 * lifts the title colour only — bronze on ink, seal-red on paper.
 */
const CARD = "group relative [--title-hover:var(--color-bronze-2)] in-[.paper]:[--title-hover:var(--color-seal)]";
const TITLE_LINK =
  "transition-colors duration-300 group-hover:text-(--title-hover) group-focus-within:text-(--title-hover) after:absolute after:inset-0 after:content-['']";

export function PostCard({ post, variant = "standard", priority = false }: PostCardProps) {
  if (variant === "featured") return <FeaturedCard post={post} priority={priority} />;
  if (variant === "compact") return <CompactCard post={post} />;
  return <StandardCard post={post} priority={priority} />;
}

/* ------------------------------- Featured ------------------------------- */

function FeaturedCard({ post, priority }: { post: PostWithMeta; priority: boolean }) {
  const hero = resolveHeroImage(post);
  const href = articlePath(post.slug);
  return (
    <article className={cn(CARD, "grid gap-8 md:grid-cols-12 md:items-end md:gap-12")} aria-labelledby={`post-${post.id}-title`}>
      {hero ? (
        <div className="relative aspect-[16/10] overflow-hidden border border-current/15 bg-charcoal md:col-span-7">
          <Image
            src={hero.src}
            alt={hero.alt}
            fill
            priority={priority}
            unoptimized={hero.unoptimized}
            sizes="(min-width: 768px) 58vw, 100vw"
            className="object-cover"
          />
        </div>
      ) : null}
      <div className={hero ? "md:col-span-5" : "md:col-span-11"}>
        <CategoryLine post={post} />
        <h3 id={`post-${post.id}-title`} className={cn("mt-5", hero ? "display-md" : "display-lg")}>
          <Link href={href} className={TITLE_LINK}>
            {post.title}
          </Link>
        </h3>
        {post.deck ? <p className={cn("lede mt-5 opacity-85", hero ? "max-w-md" : "max-w-3xl")}>{post.deck}</p> : null}
        <MetaLine post={post} className="mt-7" />
        <p className="mt-6 inline-flex items-center gap-2 font-mono text-[0.66rem] uppercase tracking-[0.2em] text-current/60 transition-colors group-hover:text-current">
          Read the note <Arrow />
        </p>
      </div>
    </article>
  );
}

/* ------------------------------- Standard ------------------------------- */

function StandardCard({ post, priority }: { post: PostWithMeta; priority: boolean }) {
  const hero = resolveHeroImage(post);
  const href = articlePath(post.slug);
  return (
    <article className={cn(CARD, "flex h-full flex-col border-t border-current/25 pt-5")} aria-labelledby={`post-${post.id}-title`}>
      <div className="relative aspect-[4/3] overflow-hidden border border-current/10 bg-charcoal">
        {hero ? (
          <Image
            src={hero.src}
            alt={hero.alt}
            fill
            priority={priority}
            unoptimized={hero.unoptimized}
            sizes="(min-width: 1024px) 28vw, (min-width: 640px) 45vw, 100vw"
            className="object-cover"
          />
        ) : (
          <Monogram title={post.title} label={post.category?.name ?? "Case note"} />
        )}
      </div>
      <div className="mt-5">
        <CategoryLine post={post} />
      </div>
      <h3 id={`post-${post.id}-title`} className="display-sm mt-3">
        <Link href={href} className={TITLE_LINK}>
          {post.title}
        </Link>
      </h3>
      {post.excerpt ? <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-current/75">{post.excerpt}</p> : null}
      <MetaLine post={post} className="mt-auto pt-5" />
    </article>
  );
}

/* -------------------------------- Compact ------------------------------- */

function CompactCard({ post }: { post: PostWithMeta }) {
  const href = articlePath(post.slug);
  return (
    <article className={cn(CARD, "grid grid-cols-[4.5rem_1fr] gap-4 border-t border-current/15 py-5")} aria-labelledby={`post-${post.id}-title`}>
      <p className="pt-1 font-mono text-[0.62rem] uppercase leading-relaxed tracking-[0.18em] text-current/55">
        {post.publishedAt ? <time dateTime={post.publishedAt.toISOString()}>{formatDateShort(post.publishedAt)}</time> : "Undated"}
      </p>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {post.category ? <p className="eyebrow-muted">{post.category.name}</p> : null}
          {post.isDemo ? <DemoBadge /> : null}
        </div>
        <h3 id={`post-${post.id}-title`} className="mt-1 font-display text-xl leading-tight md:text-2xl">
          <Link href={href} className={TITLE_LINK}>
            {post.title}
          </Link>
        </h3>
        <p className="mt-2 font-mono text-[0.62rem] uppercase tracking-[0.18em] text-current/55">
          {post.authorName}
          <span aria-hidden="true"> · </span>
          {readingLabel(post.readingMinutes)}
        </p>
      </div>
    </article>
  );
}

/* -------------------------------- Pieces -------------------------------- */

function CategoryLine({ post }: { post: PostWithMeta }) {
  if (!post.category && !post.isDemo) return null;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      {post.category ? <p className="eyebrow">{post.category.name}</p> : null}
      {post.isDemo ? <DemoBadge /> : null}
    </div>
  );
}

function MetaLine({ post, className }: { post: PostWithMeta; className?: string }) {
  return (
    <p className={cn("font-mono text-[0.64rem] uppercase tracking-[0.18em] text-current/60", className)}>
      <span>{post.authorName}</span>
      {post.publishedAt ? (
        <>
          <span aria-hidden="true"> · </span>
          <time dateTime={post.publishedAt.toISOString()}>{formatDate(post.publishedAt)}</time>
        </>
      ) : null}
      <span aria-hidden="true"> · </span>
      <span>{readingLabel(post.readingMinutes)}</span>
    </p>
  );
}

/**
 * Typographic plate for posts without an image: the article's initial set in Cormorant
 * on a charcoal block with film grain — a printer's block rather than a placeholder.
 */
export function Monogram({ title, label, className }: { title: string; label?: string | null; className?: string }) {
  const initial = (title.match(/[A-Za-z]/)?.[0] ?? "§").toUpperCase();
  return (
    <div aria-hidden="true" className={cn("relative flex h-full w-full items-center justify-center overflow-hidden bg-charcoal text-ivory grain vignette", className)}>
      <div className="absolute inset-3 border border-bronze/25" />
      <div className="relative flex flex-col items-center">
        <span className="select-none font-display text-[clamp(4.5rem,9vw,7rem)] leading-none text-ivory/90">{initial}</span>
        <span className="mt-3 h-px w-10 bg-seal-2" />
      </div>
      <span className="absolute bottom-5 left-5 max-w-[70%] truncate font-mono text-[0.58rem] uppercase tracking-[0.24em] text-bronze-2">{label || "Case note"}</span>
    </div>
  );
}
