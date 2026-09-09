"use client";

import { useId, useState } from "react";
import { cn } from "@/lib/utils";
import { CommentForm } from "./CommentForm";
import { ReportButton } from "./ReportButton";
import type { CommentView } from "./types";

export function CommentItem({ comment, postId, postSlug, depth = 0 }: { comment: CommentView; postId: string; postSlug: string; depth?: 0 | 1 }) {
  const [replying, setReplying] = useState(false);
  const id = useId();
  const formId = `${id}-reply`;

  return (
    <article id={`comment-${comment.id}`} className="scroll-mt-28" aria-labelledby={`${id}-author`}>
      <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <p id={`${id}-author`} className={cn("font-display text-ivory", depth === 0 ? "text-xl" : "text-lg")}>
          {comment.author}
        </p>
        {comment.inReplyTo ? <p className="font-mono text-[0.62rem] uppercase tracking-[0.18em] text-bone/70">replying to {comment.inReplyTo}</p> : null}
        <time dateTime={comment.whenIso} title={comment.whenFull} className="font-mono text-[0.62rem] uppercase tracking-[0.18em] text-ash">
          {comment.when}
        </time>
      </header>

      <div className="prose-ugc mt-3 max-w-[62ch] break-words text-parchment/90" dangerouslySetInnerHTML={{ __html: comment.bodyHtml }} />

      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2">
        <button
          type="button"
          className="link-underline font-mono text-[0.66rem] uppercase tracking-[0.2em] text-bronze-2 transition-colors hover:text-ivory"
          aria-expanded={replying}
          aria-controls={formId}
          onClick={() => setReplying((v) => !v)}
        >
          {replying ? "Cancel reply" : "Reply"}
        </button>
        <ReportButton commentId={comment.id} postSlug={postSlug} />
      </div>

      <div id={formId} hidden={!replying} className="mt-6">
        {replying ? (
          <CommentForm postId={postId} postSlug={postSlug} parentId={comment.id} replyingTo={comment.author} onCancel={() => setReplying(false)} focusOnMount />
        ) : null}
      </div>
    </article>
  );
}
