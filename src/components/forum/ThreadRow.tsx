import Link from "next/link";
import type { ThreadPublic } from "@/server/forum";
import { cn, displayName, formatDate, formatDateShort, pluralise, timeAgo } from "@/lib/utils";
import { forumHref, threadPath } from "./format";

/*
 * One line of the cause list. A row, not a card: markers and category above, the title in
 * display serif, mono metadata beneath, the tally of replies on the right. The whole row is
 * one link (stretched from the title); the category chip sits above it and stays clickable.
 * Rows carry their own bottom hairline, so a list needs only a top border on the container.
 */
export function ThreadRow({ thread, compact = false }: { thread: ThreadPublic; compact?: boolean }) {
  const href = threadPath(thread.slug);
  const titleId = `thread-${thread.id}-title`;
  const hasMarkers = thread.pinned || thread.locked || Boolean(thread.category);
  const created = thread.createdAt;

  return (
    <article
      className={cn("group relative grid gap-x-8 gap-y-3 border-b md:grid-cols-[minmax(0,1fr)_auto] md:items-start", compact ? "py-4" : "py-6 md:py-7")}
      aria-labelledby={titleId}
    >
      <div className="min-w-0">
        {hasMarkers ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            {thread.pinned ? <span className="font-mono text-[0.6rem] uppercase tracking-[0.22em] text-lapis in-[.surface-lapis]:text-bronze-2">Pinned</span> : null}
            {thread.category ? (
              <Link
                href={forumHref({ category: thread.category.slug })}
                className="chip relative z-[1] whitespace-nowrap transition-colors hover:border-current hover:text-lapis in-[.surface-lapis]:hover:text-bronze-2"
              >
                {thread.category.name}
              </Link>
            ) : null}
            {thread.locked ? <span className="font-mono text-[0.6rem] uppercase tracking-[0.22em] text-ash in-[.surface-lapis]:text-bone">Closed</span> : null}
          </div>
        ) : null}

        <h3
          id={titleId}
          className={cn(
            "font-display leading-[1.15] text-ink transition-colors duration-300 group-hover:text-[var(--title-hover)] group-focus-within:text-[var(--title-hover)] [--title-hover:var(--color-lapis)] in-[.surface-lapis]:text-ivory in-[.surface-lapis]:[--title-hover:var(--color-bronze-2)]",
            hasMarkers ? (compact ? "mt-2" : "mt-3") : "",
            compact ? "text-xl md:text-[1.4rem]" : "text-2xl md:text-[1.8rem]",
          )}
        >
          <Link href={href} className="after:absolute after:inset-0 after:content-['']">
            {thread.title}
          </Link>
        </h3>

        <p className="mt-2 font-mono text-[0.62rem] uppercase tracking-[0.18em] text-ash in-[.surface-lapis]:text-bone">
          <span>{displayName(thread.authorName)}</span>
          <span aria-hidden="true"> · </span>
          <time dateTime={created.toISOString()} title={formatDate(created)}>
            {compact ? formatDateShort(created) : formatDate(created)}
          </time>
        </p>

        {!compact && thread.tags.length ? (
          <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Tags">
            {thread.tags.map((t) => (
              <li key={t.id}>
                <span className="chip text-[0.58rem] text-ash in-[.surface-lapis]:text-bone">{t.name}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <dl
        className={cn(
          "flex flex-wrap gap-x-5 gap-y-1 font-mono text-[0.62rem] uppercase tracking-[0.18em] text-ash tabular-nums in-[.surface-lapis]:text-bone md:flex-col md:items-end md:gap-y-1.5 md:text-right",
          compact ? "md:pt-1" : "md:pt-1.5",
        )}
      >
        <div>
          <dt className="sr-only">Replies</dt>
          <dd className="text-ink in-[.surface-lapis]:text-parchment">{pluralise(thread.replyCount, "reply", "replies")}</dd>
        </div>
        <div>
          <dt className="sr-only">Last activity</dt>
          <dd>
            Active{" "}
            <time dateTime={thread.lastActivityAt.toISOString()} title={formatDate(thread.lastActivityAt)}>
              {timeAgo(thread.lastActivityAt)}
            </time>
          </dd>
        </div>
      </dl>
    </article>
  );
}
