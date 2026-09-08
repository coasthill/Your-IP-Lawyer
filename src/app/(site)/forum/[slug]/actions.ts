"use server";

import type { ReplyFormState, ReportState } from "@/components/forum/types";
import { threadPath } from "@/components/forum/format";
import { createReply, reportContent } from "@/server/forum";
import { revalidateContent } from "@/server/revalidate";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SLUG = /^[a-z0-9][a-z0-9-]{0,119}$/;

function text(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}

function threadPaths(slug: string): string[] {
  return SLUG.test(slug) ? [threadPath(slug)] : [];
}

/** Guest reply on a discussion. Validation, rate limiting and moderation happen in createReply(). */
export async function submitReply(_prev: ReplyFormState, formData: FormData): Promise<ReplyFormState> {
  const threadId = text(formData.get("threadId"));
  const parentId = text(formData.get("parentId")) || null;
  const slug = text(formData.get("threadSlug"));
  if (!UUID.test(threadId) || (parentId && !UUID.test(parentId))) {
    return { status: "error", error: "This discussion does not accept replies." };
  }
  try {
    const result = await createReply({
      threadId,
      parentId,
      name: formData.get("name"),
      email: formData.get("email"),
      body: formData.get("body"),
      honeypot: formData.get("website"),
      turnstileToken: formData.get("cf-turnstile-response"),
    });
    if (!result.ok) return { status: "error", error: result.error };
    revalidateContent(threadPaths(slug));
    return { status: result.status };
  } catch {
    return { status: "error", error: "Something went wrong on our side. Please try again in a moment." };
  }
}

/** Community report on a thread or a reply. Rate limited and de-duplicated per connection in reportContent(). */
export async function reportForumContent(_prev: ReportState, formData: FormData): Promise<ReportState> {
  const targetId = text(formData.get("targetId"));
  const targetType = text(formData.get("targetType"));
  const slug = text(formData.get("threadSlug"));
  if (!UUID.test(targetId) || (targetType !== "thread" && targetType !== "reply")) {
    return { status: "error", error: "That item could not be identified." };
  }
  try {
    const result = await reportContent({ targetType, targetId, reason: formData.get("reason") });
    if (!result.ok) return { status: "error", error: result.error ?? "The report could not be filed. Please try again later." };
    revalidateContent(threadPaths(slug));
    return { status: "done" };
  } catch {
    return { status: "error", error: "The report could not be filed. Please try again later." };
  }
}
