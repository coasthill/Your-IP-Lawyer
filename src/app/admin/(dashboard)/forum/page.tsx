import Link from "next/link";
import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/guard";
import { renderPlainText } from "@/lib/security/sanitize";
import { displayName, pluralise } from "@/lib/utils";
import { listCommentsForAdmin } from "@/server/comments";
import { countPendingForum, listOpenReports, listRepliesForAdmin, listThreadsForAdmin } from "@/server/forum";
import { listCategories } from "@/server/taxonomy";
import { EmptyRecord } from "@/components/admin/EmptyRecord";
import { Entry, EntryList } from "@/components/admin/Entry";
import { InlineAction } from "@/components/admin/InlineAction";
import { LinkTabs } from "@/components/admin/LinkTabs";
import { ModerationActions } from "@/components/admin/ModerationActions";
import { NewThreadForm } from "@/components/admin/NewThreadForm";
import { PageHeader, SectionHeading } from "@/components/admin/PageHeader";
import { FlagChip, StatusChip } from "@/components/admin/StatusChip";
import { Notice } from "@/components/ui/primitives";
import { formatDateTime } from "../../_lib/datetime";
import { param, paramOneOf, type SearchParams } from "../../_lib/params";
import {
  approveReplyAction,
  approveThreadAction,
  createThreadAction,
  deleteReplyAction,
  deleteThreadAction,
  hideReplyAction,
  hideThreadAction,
  lockThreadAction,
  pendReplyAction,
  pendThreadAction,
  pinThreadAction,
  resolveReportAction,
  spamReplyAction,
  spamThreadAction,
} from "./actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Forum · Admin" };

const VIEWS = ["threads", "replies"] as const;
const STATUSES = ["pending", "approved", "hidden", "spam", "all"] as const;
type View = (typeof VIEWS)[number];
type Status = (typeof STATUSES)[number];

const STATUS_LABEL: Record<Status, string> = { pending: "Pending", approved: "Approved", hidden: "Hidden", spam: "Spam", all: "All" };

function queueHref(view: View, status: Status) {
  return `/admin/forum?view=${view}&status=${status}#queue`;
}

export default async function ForumAdminPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const view = paramOneOf(sp, "view", VIEWS, "threads");
  const status = paramOneOf(sp, "status", STATUSES, "pending");
  const created = param(sp, "created");

  const admin = await requireAdmin();
  const [threads, replies, pending, reports, categories] = await Promise.all([
    listThreadsForAdmin(status === "all" ? undefined : status),
    listRepliesForAdmin(status === "all" ? undefined : status),
    countPendingForum(),
    listOpenReports(),
    listCategories("forum"),
  ]);

  // Resolve report targets so every report links to the thing complained about.
  const needThreads = reports.some((r) => r.targetType === "thread" || r.targetType === "reply");
  const needComments = reports.some((r) => r.targetType === "comment");
  const [allThreads, allReplies, allComments] = await Promise.all([
    needThreads ? listThreadsForAdmin() : Promise.resolve([]),
    reports.some((r) => r.targetType === "reply") ? listRepliesForAdmin() : Promise.resolve([]),
    needComments ? listCommentsForAdmin() : Promise.resolve([]),
  ]);
  const threadById = new Map(allThreads.map((t) => [t.id, t]));
  const replyById = new Map(allReplies.map((r) => [r.id, r]));
  const commentById = new Map(allComments.map((c) => [c.id, c]));

  const rows = view === "threads" ? threads : replies;
  const pendingTotal = pending.threads + pending.replies;

  return (
    <div>
      <PageHeader
        eyebrow="Forum · Moderation"
        title={pendingTotal > 0 ? `${pluralise(pendingTotal, "matter")} awaiting a ruling.` : "The forum, in order."}
        lede="Discussions and replies from guests, community reports, and the option to open a discussion yourself. Pinned discussions lead the forum; locked ones accept no further replies."
        actions={
          <>
            <a href="#reports" className="btn btn-sm">
              Reports{reports.length ? ` · ${reports.length}` : ""}
            </a>
            <a href="#new-discussion" className="btn btn-solid btn-sm">
              New discussion
            </a>
          </>
        }
      />

      {created ? (
        <Notice tone="success" className="mb-8">
          Discussion opened.{" "}
          <Link href={`/forum/${created}`} className="underline underline-offset-4">
            View it on the site
          </Link>
          .
        </Notice>
      ) : null}

      {/* ---------------------------------------------------------- 01 Reports */}
      <section id="reports" className="scroll-mt-20" aria-labelledby="reports-heading">
        <SectionHeading number="01" title={<span id="reports-heading">Community reports</span>} aside={reports.length ? `${pluralise(reports.length, "open report")}` : "None open"} />
        {reports.length ? (
          <EntryList>
            {reports.map((r) => {
              const target =
                r.targetType === "thread"
                  ? (() => {
                      const t = threadById.get(r.targetId);
                      return t ? { label: t.title, href: `/forum/${t.slug}`, status: t.status, admin: `/admin/forum?view=threads&status=${t.status}#thread-${t.id}` } : null;
                    })()
                  : r.targetType === "reply"
                    ? (() => {
                        const x = replyById.get(r.targetId);
                        return x ? { label: `Reply by ${displayName(x.authorName)} in “${x.threadTitle}”`, href: `/forum/${x.threadSlug}#reply-${x.id}`, status: x.status, admin: `/admin/forum?view=replies&status=${x.status}#reply-${x.id}` } : null;
                      })()
                    : (() => {
                        const c = commentById.get(r.targetId);
                        return c ? { label: `Comment by ${displayName(c.authorName)} on “${c.postTitle}”`, href: `/blog/${c.postSlug}#comment-${c.id}`, status: c.status, admin: `/admin/comments?status=${c.status}#comment-${c.id}` } : null;
                      })();
              return (
                <Entry
                  key={r.id}
                  meta={
                    <>
                      <FlagChip tone="seal">{r.targetType}</FlagChip>
                      <time dateTime={r.createdAt.toISOString()}>{formatDateTime(r.createdAt)}</time>
                      {target ? <StatusChip status={target.status} /> : <span className="text-seal">target removed</span>}
                    </>
                  }
                  title={target ? target.label : "The reported item has already been deleted."}
                  footer={
                    <>
                      <span className="text-graphite">{r.reason ? `Reason: ${r.reason}` : "No reason given."}</span>
                      {target ? (
                        <span className="ml-3 inline-flex gap-3">
                          <Link href={target.admin} className="link-underline">
                            Open in queue
                          </Link>
                          <Link href={target.href} className="link-underline">
                            View on site
                          </Link>
                        </span>
                      ) : null}
                    </>
                  }
                  actions={
                    <InlineAction action={resolveReportAction.bind(null, r.id)} pendingLabel="Resolving…">
                      Resolve
                    </InlineAction>
                  }
                />
              );
            })}
          </EntryList>
        ) : (
          <EmptyRecord title="No open reports." body="Readers can flag a comment, discussion or reply. Flags land here until you resolve them." />
        )}
      </section>

      {/* ---------------------------------------------------------- 02 Queue */}
      <section id="queue" className="mt-16 scroll-mt-20" aria-labelledby="queue-heading">
        <SectionHeading number="02" title={<span id="queue-heading">{view === "threads" ? "Discussions" : "Replies"}</span>} aside={`${pending.threads} discussions · ${pending.replies} replies pending`} />

        <LinkTabs
          label="Content type"
          active={view}
          tabs={[
            { key: "threads", label: "Discussions", href: queueHref("threads", status), count: pending.threads },
            { key: "replies", label: "Replies", href: queueHref("replies", status), count: pending.replies },
          ]}
        />
        <LinkTabs label="Status" active={status} tabs={STATUSES.map((s) => ({ key: s, label: STATUS_LABEL[s], href: queueHref(view, s) }))} />

        {rows.length === 0 ? (
          <EmptyRecord
            title={status === "pending" ? "The queue is clear." : `Nothing filed under “${STATUS_LABEL[status].toLowerCase()}”.`}
            body={status === "pending" ? "Nothing awaits approval. Counsel may proceed." : view === "threads" ? "Nothing here yet. Start the argument below." : "Replies arrive once discussions are live."}
          />
        ) : view === "threads" ? (
          <EntryList>
            {threads.map((t) => (
              <Entry
                key={t.id}
                id={`thread-${t.id}`}
                meta={
                  <>
                    <span className="text-ink">{displayName(t.authorName)}</span>
                    <time dateTime={t.createdAt.toISOString()}>{formatDateTime(t.createdAt)}</time>
                    <StatusChip status={t.status} />
                    {t.pinned ? <FlagChip tone="bronze">Pinned</FlagChip> : null}
                    {t.locked ? <FlagChip>Locked</FlagChip> : null}
                    {t.reportCount > 0 ? <FlagChip tone="seal">{pluralise(t.reportCount, "report")}</FlagChip> : null}
                    <span>
                      {pluralise(t.replyCount, "reply", "replies")} · {pluralise(t.viewCount, "view")}
                    </span>
                  </>
                }
                title={
                  t.status === "approved" ? (
                    <Link href={`/forum/${t.slug}`} className="transition-colors hover:text-lapis">
                      {t.title}
                    </Link>
                  ) : (
                    t.title
                  )
                }
                bodyHtml={renderPlainText(t.body)}
                footer={<span className="font-mono text-[0.62rem] tracking-[0.06em] text-ash">/forum/{t.slug}</span>}
                actions={
                  <ModerationActions
                    status={t.status}
                    approve={approveThreadAction.bind(null, t.id)}
                    hide={hideThreadAction.bind(null, t.id)}
                    spam={spamThreadAction.bind(null, t.id)}
                    pend={pendThreadAction.bind(null, t.id)}
                    remove={deleteThreadAction.bind(null, t.id)}
                  >
                    <InlineAction action={pinThreadAction.bind(null, t.id, !t.pinned)} variant="ghost" pendingLabel="Saving…" title={t.pinned ? "Stop leading the forum with this discussion" : "Keep this discussion at the top of the forum"}>
                      {t.pinned ? "Unpin" : "Pin"}
                    </InlineAction>
                    <InlineAction action={lockThreadAction.bind(null, t.id, !t.locked)} variant="ghost" pendingLabel="Saving…" title={t.locked ? "Allow new replies" : "Close the discussion to new replies"}>
                      {t.locked ? "Unlock" : "Lock"}
                    </InlineAction>
                  </ModerationActions>
                }
              />
            ))}
          </EntryList>
        ) : (
          <EntryList>
            {replies.map((r) => (
              <Entry
                key={r.id}
                id={`reply-${r.id}`}
                meta={
                  <>
                    <span className="text-ink">{displayName(r.authorName)}</span>
                    {r.parentId ? <span>in reply</span> : null}
                    <span>
                      in{" "}
                      <Link href={`/forum/${r.threadSlug}#reply-${r.id}`} className="link-underline text-lapis">
                        {r.threadTitle}
                      </Link>
                    </span>
                    <time dateTime={r.createdAt.toISOString()}>{formatDateTime(r.createdAt)}</time>
                    <StatusChip status={r.status} />
                    {r.reportCount > 0 ? <FlagChip tone="seal">{pluralise(r.reportCount, "report")}</FlagChip> : null}
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
        )}
        {rows.length >= 300 ? <p className="mt-4 text-xs text-ash">Showing the latest 300. Older entries appear as these are dealt with.</p> : null}
      </section>

      {/* ---------------------------------------------------------- 03 New discussion */}
      <section id="new-discussion" className="mt-16 scroll-mt-20" aria-labelledby="new-discussion-heading">
        <SectionHeading number="03" title={<span id="new-discussion-heading">Open a discussion</span>} aside="Published immediately, no moderation" />
        <p className="mb-6 max-w-2xl text-sm text-slate">Nothing here yet? Start the argument. A discussion opened from here goes live at once under the name you choose, and can be pinned to lead the forum.</p>
        <div className="max-w-3xl">
          <NewThreadForm action={createThreadAction} categories={categories.map((c) => ({ id: c.id, name: c.name }))} authorName={admin.name} />
        </div>
      </section>
    </div>
  );
}
