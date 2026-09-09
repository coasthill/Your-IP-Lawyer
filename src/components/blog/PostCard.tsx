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
 * Every card is a `.plate`: ivory on paper, translucent on a blue surface (the plate adapts).
 * The whole card is one link (stretched from the title); hovering lifts the title colour only —
 * lapis on paper, gold on blue.
 */
const CARD = "group relative plate [--title-hover:var(--color-lapis)] in-[.surface-lapis]:[--title-hover:var(--color-bronze-2)] in-[.surface-deep]:[--title-hover:var(--color-bronze-2)]";
const TITLE_LINK =
  "transition-colors duration-300 group-hover:text-(--title-hover) group-focus-within:text-(--title-hover) after:absolute after:inset-0 after:content-['']";
/* Mono meta lines: ash on paper, bone on blue. */
const META = "font-mono uppercase text-ash in-[.surface-lapis]:text-bone in-[.surface-deep]:text-bone";
/* Running text inside a card: graphite on paper, bone on blue. */
const BODY = "text-graphite in-[.surface-lapis]:text-bone in-[.surface-deep]:text-bone";

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
    <article className={cn(CARD, "grid overflow-hidden md:grid-cols-12")} aria-labelledby={`post-${post.id}-title`}>
      {hero ? (
        <div className="relative aspect-[16/10] overflow-hidden bg-vellum md:col-span-7 md:aspect-auto md:min-h-[26rem]">
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
      ) : (
        /* No photograph on file: a printer's block carries the lead instead. */
        <div className="relative aspect-[16/10] overflow-hidden sm:aspect-[2/1] md:col-span-5 md:aspect-auto md:min-h-[24rem]">
          <Monogram title={post.title} label={post.category?.name ?? "Case note"} size="lg" />
        </div>
      )}
      <div className={cn("flex flex-col justify-end p-6 sm:p-8 md:p-10", hero ? "md:col-span-5" : "md:col-span-7")}>
        <CategoryLine post={post} />
        <h3 id={`post-${post.id}-title`} className={cn("mt-5", hero ? "display-md" : "display-lg max-w-3xl")}>
          <Link href={href} className={TITLE_LINK}>
            {post.title}
          </Link>
        </h3>
        {post.deck ? <p className={cn("lede mt-5 opacity-85", hero ? "max-w-md" : "max-w-2xl")}>{post.deck}</p> : null}
        <MetaLine post={post} className="mt-7" />
        <p className={cn(META, "mt-6 inline-flex items-center gap-2 text-[0.66rem] tracking-[0.2em] transition-colors group-hover:text-(--title-hover)")}>
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
    <article className={cn(CARD, "flex h-full flex-col overflow-hidden")} aria-labelledby={`post-${post.id}-title`}>
      <div className="relative aspect-[4/3] overflow-hidden bg-vellum">
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
      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <CategoryLine post={post} />
        <h3 id={`post-${post.id}-title`} className="display-sm mt-3">
          <Link href={href} className={TITLE_LINK}>
            {post.title}
          </Link>
        </h3>
        {post.excerpt ? <p className={cn(BODY, "mt-3 line-clamp-3 text-sm leading-relaxed")}>{post.excerpt}</p> : null}
        <MetaLine post={post} className="mt-auto pt-5" />
      </div>
    </article>
  );
}

/* -------------------------------- Compact ------------------------------- */

function CompactCard({ post }: { post: PostWithMeta }) {
  const href = articlePath(post.slug);
  return (
    <article className={cn(CARD, "grid grid-cols-[4.5rem_1fr] gap-4 px-5 py-4 sm:px-6 sm:py-5")} aria-labelledby={`post-${post.id}-title`}>
      <p className={cn(META, "pt-1 text-[0.62rem] leading-relaxed tracking-[0.18em]")}>
        {post.publishedAt ? <time dateTime={post.publishedAt.toISOString()}>{formatDateShort(post.publishedAt)}</time> : "Undated"}
      </p>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {post.category ? <p className="eyebrow">{post.category.name}</p> : null}
          {post.isDemo ? <DemoBadge /> : null}
        </div>
        <h3 id={`post-${post.id}-title`} className="mt-1 font-display text-xl leading-tight md:text-2xl">
          <Link href={href} className={TITLE_LINK}>
            {post.title}
          </Link>
        </h3>
        <p className={cn(META, "mt-2 text-[0.62rem] tracking-[0.18em]")}>
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
    <p className={cn(META, "text-[0.64rem] tracking-[0.18em]", className)}>
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
 * Typographic plate for posts without an image: the article's initial set in Cormorant inside
 * the gold ring mark, on the painted lapis wall — a printer's block rather than a placeholder.
 */
export function Monogram({
  title,
  label,
  size = "md",
  className,
}: {
  title: string;
  label?: string | null;
  /** `lg` for the featured slot, where the plate is much wider. */
  size?: "md" | "lg";
  className?: string;
}) {
  const initial = (title.match(/[A-Za-z]/)?.[0] ?? "§").toUpperCase();
  return (
    <div
      aria-hidden="true"
      className={cn("relative flex h-full w-full items-center justify-center overflow-hidden bg-linear-to-br from-lapis to-lapis-3 text-ivory grain vignette", className)}
    >
      <div className="absolute inset-3 border border-ivory/20" />
      <div className="relative flex flex-col items-center">
        <span
          className={cn(
            "flex items-center justify-center rounded-full border-bronze-2 text-bronze-2",
            size === "lg" ? "size-[clamp(7rem,15vw,12rem)] border-2" : "size-[clamp(5rem,10vw,7.5rem)] border",
          )}
        >
          <span className={cn("select-none pb-[0.06em] font-display leading-none", size === "lg" ? "text-[clamp(4rem,9vw,7rem)]" : "text-[clamp(2.8rem,6vw,4.4rem)]")}>{initial}</span>
        </span>
      </div>
      <span className="absolute bottom-5 left-5 max-w-[70%] truncate font-mono text-[0.58rem] uppercase tracking-[0.24em] text-bronze-2">{label || "Case note"}</span>
      {size === "lg" ? <span className="absolute right-5 top-5 font-mono text-[0.58rem] uppercase tracking-[0.24em] text-bone/70">Lead</span> : null}
    </div>
  );
}
