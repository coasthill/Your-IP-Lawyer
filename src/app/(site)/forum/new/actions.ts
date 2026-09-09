"use server";

import { redirect } from "next/navigation";
import type { ThreadFormState } from "@/components/forum/types";
import { threadPath } from "@/components/forum/format";
import { createThread } from "@/server/forum";
import { revalidateContent } from "@/server/revalidate";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SLUG = /^[a-z0-9][a-z0-9-]{0,119}$/;

function text(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}

/**
 * Guest-started discussion. Validation, rate limiting, spam scoring and moderation happen in
 * createThread(). An approved thread redirects straight to its page; a held one reports back.
 */
export async function submitThread(_prev: ThreadFormState, formData: FormData): Promise<ThreadFormState> {
  const categoryId = text(formData.get("categoryId"));
  let result: Awaited<ReturnType<typeof createThread>>;
  try {
    result = await createThread({
      title: formData.get("title"),
      body: formData.get("body"),
      categoryId: UUID.test(categoryId) ? categoryId : undefined,
      tags: formData.get("tags"),
      name: formData.get("name"),
      email: formData.get("email"),
      honeypot: formData.get("website"),
      turnstileToken: formData.get("cf-turnstile-response"),
    });
  } catch {
    return { status: "error", error: "Something went wrong on our side. Please try again in a moment." };
  }
  if (!result.ok) return { status: "error", error: result.error };

  const path = SLUG.test(result.slug) ? threadPath(result.slug) : null;
  revalidateContent(path ? [path] : []);
  if (result.status === "approved" && path) redirect(path);
  return { status: "pending" };
}
