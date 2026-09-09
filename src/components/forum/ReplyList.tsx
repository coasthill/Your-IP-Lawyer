import type { ReplyPublic } from "@/server/forum";
import { renderPlainText } from "@/lib/security/sanitize";
import { displayName, formatDate, timeAgo } from "@/lib/utils";
import { recordNumber } from "./format";
import { ReplyItem } from "./ReplyItem";
import type { ReplyView } from "./types";

function toView(node: ReplyPublic, inReplyTo: string | null): ReplyView {
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
 * Everything beneath a root reply is shown at one visual level. Replies to replies keep
 * their order and say who they answer, so the argument stays readable on a phone.
 */
function flattenReplies(root: ReplyPublic): ReplyView[] {
  const out: ReplyView[] = [];
  const walk = (node: ReplyPublic, parentAuthor: string | null) => {
    for (const child of node.replies) {
      out.push(toView(child, parentAuthor));
      walk(child, displayName(child.authorName));
    }
  };
  walk(root, null);
  return out;
}

export function countReplies(nodes: ReplyPublic[]): number {
  return nodes.reduce((n, node) => n + 1 + countReplies(node.replies), 0);
}

export function ReplyList({ replies, threadId, threadSlug, locked }: { replies: ReplyPublic[]; threadId: string; threadSlug: string; locked: boolean }) {
  if (!replies.length) {
    return (
      <div className="plate px-8 py-12 text-center">
        <p className="display-sm">No replies yet.</p>
        <p className="mt-2 text-sm text-slate">{locked ? "The discussion closed before anyone answered." : "Objection welcome."}</p>
      </div>
    );
  }
  return (
    <ol className="divide-y border-y">
      {replies.map((root, i) => {
        const children = flattenReplies(root);
        return (
          <li key={root.id} className="py-8 md:py-10">
            <ReplyItem reply={toView(root, null)} threadId={threadId} threadSlug={threadSlug} locked={locked} number={recordNumber(i + 1)} />
            {children.length ? (
              <ol className="mt-6 space-y-6 border-l pl-5 md:ml-8 md:pl-8">
                {children.map((child) => (
                  <li key={child.id}>
                    <ReplyItem reply={child} threadId={threadId} threadSlug={threadSlug} locked={locked} depth={1} />
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
