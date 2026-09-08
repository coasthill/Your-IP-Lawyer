import type { CommentNode } from "@/server/comments";
import { siteConfig } from "@/config/site";
import { pluralise } from "@/lib/utils";
import { CommentForm } from "./CommentForm";
import { CommentList, countComments } from "./CommentList";

/** The discussion beneath an article: approved comments, then the form. */
export function CommentsSection({ comments, postId, postSlug }: { comments: CommentNode[]; postId: string; postSlug: string }) {
  const total = countComments(comments);
  return (
    <section id="comments" className="relative scroll-mt-24 border-t border-bronze/15 bg-ink-2" aria-labelledby="comments-heading">
      <div className="container-prose py-20 md:py-28">
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
          <div>
            <p className="eyebrow">The discussion</p>
            <h2 id="comments-heading" className="display-md mt-3">
              Comments
            </h2>
          </div>
          <p className="font-mono text-[0.62rem] uppercase tracking-[0.2em] text-ash">{total ? pluralise(total, "comment") : "Nothing on record"}</p>
        </div>
        <p className="mt-5 max-w-xl text-sm leading-relaxed text-bone/80">{siteConfig.disclaimer.forum}</p>

        <div className="mt-10">
          <CommentList comments={comments} postId={postId} postSlug={postSlug} />
        </div>

        <div className="mt-16 border-t border-bronze/15 pt-10">
          <p className="eyebrow-muted">Add a comment</p>
          <h3 className="display-sm mt-3">Counsel may proceed.</h3>
          <div className="mt-8">
            <CommentForm postId={postId} postSlug={postSlug} />
          </div>
        </div>
      </div>
    </section>
  );
}
