import Link from "next/link";
import type { Metadata } from "next";
import { renderPlainText } from "@/lib/security/sanitize";
import { displayName } from "@/lib/utils";
import { countPendingComments, listCommentsForAdmin } from "@/server/comments";
import { countPendingForum, listOpenReports, listRepliesForAdmin, listThreadsForAdmin } from "@/server/forum";
import { listPostsForAdmin } from "@/server/posts";
import { countNewSubmissions } from "@/server/submissions";
import { EmptyRecord } from "@/components/admin/EmptyRecord";
import { Entry, EntryList } from "@/components/admin/Entry";
import { ModerationActions } from "@/components/admin/ModerationActions";
import { PageHeader, SectionHeading } from "@/components/admin/PageHeader";
import { Stat, StatGrid } from "@/components/admin/Stat";
import { FlagChip, StatusChip } from "@/components/admin/StatusChip";
import { formatDateTime } from "../_lib/datetime";
import { approveCommentAction, deleteCommentAction, hideCommentAction, pendCommentAction, spamCommentAction } from "./comments/actions";
import {
  approveReplyAction,
  approveThreadAction,
  deleteReplyAction,
  deleteThreadAction,
  hideReplyAction,
  hideThreadAction,
  pendReplyAction,
  pendThreadAction,
  spamReplyAction,
  spamThreadAction,
} from "./forum/actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Overview · Admin" };

const QUEUE_PREVIEW = 5;

export default async function OverviewPage() {
  const [posts, pendingComments, pendingForum, newSubmissions, openReports, queuedComments, queuedThreads, queuedReplies] = await Promise.all([
    listPostsForAdmin(),
    countPendingComments(),
    countPendingForum(),
    countNewSubmissions(),
    listOpenReports(),
    listCommentsForAdmin("pending"),
    listThreadsForAdmin("pending"),
    listRepliesForAdmin("pending"),
  ]);

  const published = posts.filter((p) => p.status === "published").length;
  const drafts = posts.length - published;
  const moderationMode = (process.env.MODERATION_MODE || "auto").toLowerCase() === "manual" ? "manual" : "auto";
  const awaiting = pendingComments + pendingForum.threads + pendingForum.replies;

  return (
    <div>
      <PageHeader
        eyebrow="Overview · The record"
        title={awaiting > 0 ? `${awaiting} ${awaiting === 1 ? "matter awaits" : "matters await"} your attention.` : "The queue is clear. Counsel may proceed."}
        lede="Counts first, then whatever guests have filed since you last looked. Approve, hide or strike from here, or open the full queues."
        actions={
          <>
            <Link href="/admin/posts/new" className="btn btn-solid btn-sm">
              New post
            </Link>
            <Link href="/admin/documents#upload" className="btn btn-sm">
              Upload document
            </Link>
          </>
        }
      />

      <StatGrid>
        <Stat number="01" label="Published" value={published} href="/admin/posts" />
        <Stat number="02" label="Drafts" value={drafts} href="/admin/posts" />
        <Stat number="03" label="Comments pending" value={pendingComments} href="/admin/comments?status=pending" tone="attention" />
        <Stat number="04" label="Forum pending" value={pendingForum.threads + pendingForum.replies} href="/admin/forum?view=threads&status=pending" tone="attention" />
        <Stat number="05" label="New submissions" value={newSubmissions} href="/admin/submissions?status=new" tone="attention" />
        <Stat number="06" label="Open reports" value={openReports.length} href="/admin/forum#reports" tone="attention" />
      </StatGrid>

      <p className="mt-4 font-mono text-[0.64rem] uppercase tracking-[0.16em] text-ash">
        Moderation mode · <span className="text-lapis">{moderationMode}</span>
        <span className="normal-case tracking-normal">
          {" "}
          — {moderationMode === "manual" ? "every guest comment, discussion and reply waits here for approval." : "clean guest content goes live at once; links, shouting and blocked phrases are held here; obvious spam is stored as spam."}
          {" "}Set MODERATION_MODE in the environment to change this.
        </span>
      </p>

      <section className="mt-16" aria-labelledby="queue-comments">
        <SectionHeading number="01" title={<span id="queue-comments">Comments awaiting approval</span>} aside={<Link href="/admin/comments?status=pending" className="link-underline font-mono text-[0.64rem] uppercase tracking-[0.18em]">All comments</Link>} />
        {queuedComments.length ? (
          <EntryList>
            {queuedComments.slice(0, QUEUE_PREVIEW).map((c) => (
              <Entry
                key={c.id}
                meta={
                  <>
                    <span className="text-ink">{displayName(c.authorName)}</span>
                    <span>
                      on{" "}
                      <Link href={`/blog/${c.postSlug}#comment-${c.id}`} className="link-underline text-lapis">
                        {c.postTitle}
                      </Link>
                    </span>
                    <time dateTime={c.createdAt.toISOString()}>{formatDateTime(c.createdAt)}</time>
                    <StatusChip status={c.status} />
                    {c.reportCount > 0 ? <FlagChip tone="seal">{c.reportCount} {c.reportCount === 1 ? "report" : "reports"}</FlagChip> : null}
                  </>
                }
                bodyHtml={renderPlainText(c.body)}
                actions={
                  <ModerationActions
                    status={c.status}
                    approve={approveCommentAction.bind(null, c.id)}
                    hide={hideCommentAction.bind(null, c.id)}
                    spam={spamCommentAction.bind(null, c.id)}
                    pend={pendCommentAction.bind(null, c.id)}
                    remove={deleteCommentAction.bind(null, c.id)}
                  />
                }
              />
            ))}
          </EntryList>
        ) : (
          <EmptyRecord title="No comments waiting." body="Approved comments are live; hidden and spam ones are in the comments queue." />
        )}
        {queuedComments.length > QUEUE_PREVIEW ? <MoreLine n={queuedComments.length - QUEUE_PREVIEW} href="/admin/comments?status=pending" noun="comment" /> : null}
      </section>

      <section className="mt-16" aria-labelledby="queue-threads">
        <SectionHeading number="02" title={<span id="queue-threads">Discussions awaiting approval</span>} aside={<Link href="/admin/forum?view=threads&status=pending" className="link-underline font-mono text-[0.64rem] uppercase tracking-[0.18em]">All discussions</Link>} />
        {queuedThreads.length ? (
          <EntryList>
            {queuedThreads.slice(0, QUEUE_PREVIEW).map((t) => (
              <Entry
                key={t.id}
                meta={
                  <>
                    <span className="text-ink">{displayName(t.authorName)}</span>
                    <time dateTime={t.createdAt.toISOString()}>{formatDateTime(t.createdAt)}</time>
                    <StatusChip status={t.status} />
                    {t.reportCount > 0 ? <FlagChip tone="seal">{t.reportCount} {t.reportCount === 1 ? "report" : "reports"}</FlagChip> : null}
                  </>
                }
                title={t.title}
                bodyHtml={renderPlainText(t.body)}
                actions={
                  <ModerationActions
                    status={t.status}
                    approve={approveThreadAction.bind(null, t.id)}
                    hide={hideThreadAction.bind(null, t.id)}
                    spam={spamThreadAction.bind(null, t.id)}
                    pend={pendThreadAction.bind(null, t.id)}
                    remove={deleteThreadAction.bind(null, t.id)}
                  />
                }
              />
            ))}
          </EntryList>
        ) : (
          <EmptyRecord title="No discussions waiting." body="Nothing here yet. Start the argument yourself from the forum page." />
        )}
        {queuedThreads.length > QUEUE_PREVIEW ? <MoreLine n={queuedThreads.length - QUEUE_PREVIEW} href="/admin/forum?view=threads&status=pending" noun="discussion" /> : null}
      </section>

      <section className="mt-16" aria-labelledby="queue-replies">
        <SectionHeading number="03" title={<span id="queue-replies">Replies awaiting approval</span>} aside={<Link href="/admin/forum?view=replies&status=pending" className="link-underline font-mono text-[0.64rem] uppercase tracking-[0.18em]">All replies</Link>} />
        {queuedReplies.length ? (
          <EntryList>
            {queuedReplies.slice(0, QUEUE_PREVIEW).map((r) => (
              <Entry
                key={r.id}
                meta={
                  <>
                    <span className="text-ink">{displayName(r.authorName)}</span>
                    <span>
                      in{" "}
                      <Link href={`/forum/${r.threadSlug}#reply-${r.id}`} className="link-underline text-lapis">
                        {r.threadTitle}
                      </Link>
                    </span>
                    <time dateTime={r.createdAt.toISOString()}>{formatDateTime(r.createdAt)}</time>
                    <StatusChip status={r.status} />
                    {r.reportCount > 0 ? <FlagChip tone="seal">{r.reportCount} {r.reportCount === 1 ? "report" : "reports"}</FlagChip> : null}
                  </>
                }
                bodyHtml={renderPlainText(r.body)}
                actions={
                  <ModerationActions
                    status={r.status}
                    approve={approveReplyAction.bind(null, r.id)}
                    hide={hideReplyAction.bind(null, r.id)}
                    spam={spamReplyAction.bind(null, r.id)}
                    pend={pendReplyAction.bind(null, r.id)}
                    remove={deleteReplyAction.bind(null, r.id)}
                  />
                }
              />
            ))}
          </EntryList>
        ) : (
          <EmptyRecord title="No replies waiting." />
        )}
        {queuedReplies.length > QUEUE_PREVIEW ? <MoreLine n={queuedReplies.length - QUEUE_PREVIEW} href="/admin/forum?view=replies&status=pending" noun="reply" /> : null}
      </section>
    </div>
  );
}

function MoreLine({ n, href, noun }: { n: number; href: string; noun: string }) {
  const plural = noun === "reply" ? "replies" : `${noun}s`;
  return (
    <p className="mt-4 text-sm text-slate">
      <Link href={href} className="link-underline">
        {n} more {n === 1 ? noun : plural} in the queue
      </Link>
    </p>
  );
}
