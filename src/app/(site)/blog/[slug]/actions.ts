"use server";

import type { CommentFormState, ReportState } from "@/components/comments/types";
import { createComment } from "@/server/comments";
import { reportContent } from "@/server/forum";
import { revalidateContent } from "@/server/revalidate";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SLUG = /^[a-z0-9][a-z0-9-]{0,119}$/;

function text(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}

function articlePaths(slug: string): string[] {
  return SLUG.test(slug) ? [`/blog/${slug}`] : [];
}

/** Guest comment on an article. All validation, rate limiting and moderation happen in createComment(). */
export async function submitComment(_prev: CommentFormState, formData: FormData): Promise<CommentFormState> {
  const postId = text(formData.get("postId"));
  const parentId = text(formData.get("parentId")) || null;
  const slug = text(formData.get("postSlug"));
  if (!UUID.test(postId) || (parentId && !UUID.test(parentId))) {
    return { status: "error", error: "This article does not accept comments." };
  }
  try {
    const result = await createComment({
      postId,
      parentId,
      name: formData.get("name"),
      email: formData.get("email"),
      body: formData.get("body"),
      honeypot: formData.get("website"),
      turnstileToken: formData.get("cf-turnstile-response"),
    });
    if (!result.ok) return { status: "error", error: result.error };
    revalidateContent(articlePaths(slug));
    return { status: result.status };
  } catch {
    return { status: "error", error: "Something went wrong on our side. Please try again in a moment." };
  }
}

/** Community report on a comment. Rate limited and de-duplicated per connection in reportContent(). */
export async function reportComment(_prev: ReportState, formData: FormData): Promise<ReportState> {
  const commentId = text(formData.get("commentId"));
  const slug = text(formData.get("postSlug"));
  if (!UUID.test(commentId)) return { status: "error", error: "That comment could not be identified." };
  try {
    const result = await reportContent({ targetType: "comment", targetId: commentId, reason: formData.get("reason") });
    if (!result.ok) return { status: "error", error: result.error ?? "The report could not be filed. Please try again later." };
    revalidateContent(articlePaths(slug));
    return { status: "done" };
  } catch {
    return { status: "error", error: "The report could not be filed. Please try again later." };
  }
}
