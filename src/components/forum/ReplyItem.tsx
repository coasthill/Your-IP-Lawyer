"use client";

import { useId, useState } from "react";
import { cn } from "@/lib/utils";
import { ReplyForm } from "./ReplyForm";
import { ReportButton } from "./ReportButton";
import type { ReplyView } from "./types";

export function ReplyItem({
  reply,
  threadId,
  threadSlug,
  locked,
  depth = 0,
  number,
}: {
  reply: ReplyView;
  threadId: string;
  threadSlug: string;
  /** A closed discussion shows its replies but offers no reply control. */
  locked: boolean;
  depth?: 0 | 1;
  /** Record label ("01", "02", …) — root replies only. */
  number?: string;
}) {
  const [replying, setReplying] = useState(false);
  const id = useId();
  const formId = `${id}-reply`;

  return (
    <article id={`reply-${reply.id}`} className="scroll-mt-28" aria-labelledby={`${id}-author`}>
      <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        {number ? <span className="mr-1 font-mono text-[0.62rem] tracking-[0.22em] text-lapis">{number}</span> : null}
        <p id={`${id}-author`} className={cn("font-display text-ink", depth === 0 ? "text-xl md:text-2xl" : "text-lg md:text-xl")}>
          {reply.author}
        </p>
        {reply.inReplyTo ? <p className="font-mono text-[0.62rem] uppercase tracking-[0.18em] text-ash">replying to {reply.inReplyTo}</p> : null}
        <time dateTime={reply.whenIso} title={reply.whenFull} className="font-mono text-[0.62rem] uppercase tracking-[0.18em] text-ash">
          {reply.when}
        </time>
      </header>

      <div className="prose-ugc mt-3 max-w-[64ch] break-words text-charcoal" dangerouslySetInnerHTML={{ __html: reply.bodyHtml }} />

      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2">
        {locked ? null : (
          <button
            type="button"
            className="btn btn-sm btn-ghost -ml-[0.6rem] text-lapis"
            aria-expanded={replying}
            aria-controls={formId}
            onClick={() => setReplying((v) => !v)}
          >
            {replying ? "Cancel reply" : "Reply"}
          </button>
        )}
        <ReportButton targetType="reply" targetId={reply.id} threadSlug={threadSlug} />
      </div>

      {locked ? null : (
        <div id={formId} hidden={!replying} className="mt-6">
          {replying ? (
            <ReplyForm threadId={threadId} threadSlug={threadSlug} parentId={reply.id} replyingTo={reply.author} onCancel={() => setReplying(false)} focusOnMount />
          ) : null}
        </div>
      )}
    </article>
  );
}
