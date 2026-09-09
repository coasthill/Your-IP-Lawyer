import Link from "next/link";
import type { Metadata } from "next";
import { renderPlainText } from "@/lib/security/sanitize";
import { displayName } from "@/lib/utils";
import { countPendingComments, listCommentsForAdmin } from "@/server/comments";
import { EmptyRecord } from "@/components/admin/EmptyRecord";
import { Entry, EntryList } from "@/components/admin/Entry";
import { LinkTabs } from "@/components/admin/LinkTabs";
import { ModerationActions } from "@/components/admin/ModerationActions";
import { PageHeader } from "@/components/admin/PageHeader";
import { FlagChip, StatusChip } from "@/components/admin/StatusChip";
import { formatDateTime } from "../../_lib/datetime";
import { paramOneOf, type SearchParams } from "../../_lib/params";
import { approveCommentAction, deleteCommentAction, hideCommentAction, pendCommentAction, spamCommentAction } from "./actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Comments · Admin" };

const TABS = ["pending", "approved", "hidden", "spam", "all"] as const;
type Tab = (typeof TABS)[number];

const EMPTY: Record<Tab, { title: string; body: string }> = {
  pending: { title: "The queue is clear.", body: "Nothing awaits approval. Counsel may proceed." },
  approved: { title: "No approved comments yet.", body: "Comments that pass moderation appear here and on the article." },
  hidden: { title: "Nothing hidden.", body: "Hidden comments are kept in the record but never shown to readers." },
  spam: { title: "No spam on file.", body: "Comments marked as spam are stored, never displayed, and can be deleted here." },
  all: { title: "No comments yet.", body: "The next case note is probably being written. Comments will follow." },
};

export default async function CommentsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const tab = paramOneOf(sp, "status", TABS, "pending");

  const [rows, all, pending] = await Promise.all([listCommentsForAdmin(tab === "all" ? undefined : tab), listCommentsForAdmin(), countPendingComments()]);
  const count = (s: string) => all.filter((c) => c.status === s).length;

  return (
    <div>
      <PageHeader
        eyebrow="Comments · Moderation"
        title={pending > 0 ? `${pending} ${pending === 1 ? "comment awaits" : "comments await"} a ruling.` : "Comments on the record."}
        lede="Guest comments are plain text. Approve to publish, hide to keep without showing, spam to bury. Deleting is final."
      />

      <LinkTabs
        label="Comment status"
        active={tab}
        tabs={[
          { key: "pending", label: "Pending", href: "/admin/comments?status=pending", count: pending },
          { key: "approved", label: "Approved", href: "/admin/comments?status=approved", count: count("approved") },
          { key: "hidden", label: "Hidden", href: "/admin/comments?status=hidden", count: count("hidden") },
          { key: "spam", label: "Spam", href: "/admin/comments?status=spam", count: count("spam") },
          { key: "all", label: "All", href: "/admin/comments?status=all", count: all.length },
        ]}
      />

      {rows.length ? (
        <EntryList>
          {rows.map((c) => (
            <Entry
              key={c.id}
              id={`comment-${c.id}`}
              meta={
                <>
                  <span className="text-ink">{displayName(c.authorName)}</span>
                  {c.parentId ? <span>in reply</span> : null}
                  <span>
                    on{" "}
                    <Link href={`/blog/${c.postSlug}#comment-${c.id}`} className="link-underline text-lapis">
                      {c.postTitle}
                    </Link>
                  </span>
                  <time dateTime={c.createdAt.toISOString()}>{formatDateTime(c.createdAt)}</time>
                  <StatusChip status={c.status} />
                  {c.reportCount > 0 ? (
                    <FlagChip tone="seal">
                      {c.reportCount} {c.reportCount === 1 ? "report" : "reports"}
                    </FlagChip>
                  ) : null}
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
        <EmptyRecord title={EMPTY[tab].title} body={EMPTY[tab].body} />
      )}
      {rows.length >= 300 ? <p className="mt-4 text-xs text-ash">Showing the latest 300. Older entries appear as these are dealt with.</p> : null}
    </div>
  );
}
