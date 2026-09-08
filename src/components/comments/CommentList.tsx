import type { CommentNode } from "@/server/comments";
import { renderPlainText } from "@/lib/security/sanitize";
import { displayName, formatDate, timeAgo } from "@/lib/utils";
import { CommentItem } from "./CommentItem";
import type { CommentView } from "./types";

function toView(node: CommentNode, inReplyTo: string | null): CommentView {
  return {
    id: node.id,
    author: displayName(node.authorName),
    when: timeAgo(node.createdAt),
    whenIso: node.createdAt.toISOString(),
    whenFull: formatDate(node.createdAt),
    bodyHtml: renderPlainText(node.body),
    inReplyTo,
  };
}

/**
 * Everything beneath a root comment is shown at one visual level (max depth 2). Replies to
 * replies keep their order and say who they answer, so the thread stays readable on a phone.
 */
function flattenReplies(root: CommentNode): CommentView[] {
  const out: CommentView[] = [];
  const walk = (node: CommentNode, parentAuthor: string | null) => {
    for (const child of node.replies) {
      out.push(toView(child, parentAuthor));
      walk(child, displayName(child.authorName));
    }
  };
  walk(root, null);
  return out;
}

export function countComments(nodes: CommentNode[]): number {
  return nodes.reduce((n, node) => n + 1 + countComments(node.replies), 0);
}

export function CommentList({ comments, postId, postSlug }: { comments: CommentNode[]; postId: string; postSlug: string }) {
  if (!comments.length) {
    return (
      <div className="plate px-8 py-12 text-center">
        <p className="display-sm">No comments yet.</p>
        <p className="mt-2 text-sm text-bone">Objection welcome.</p>
      </div>
    );
  }
  return (
    <ol className="divide-y divide-bronze/15 border-y border-bronze/15">
      {comments.map((root) => {
        const replies = flattenReplies(root);
        return (
          <li key={root.id} className="py-8">
            <CommentItem comment={toView(root, null)} postId={postId} postSlug={postSlug} />
            {replies.length ? (
              <ol className="mt-6 space-y-6 border-l border-bronze/25 pl-5 md:ml-6 md:pl-8">
                {replies.map((reply) => (
                  <li key={reply.id}>
                    <CommentItem comment={reply} postId={postId} postSlug={postSlug} depth={1} />
                  </li>
                ))}
              </ol>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
