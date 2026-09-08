"use server";

import type { SubmissionFormState, SubmissionValues } from "@/components/pages/types";
import { createSubmission } from "@/server/submissions";
import { revalidateContent } from "@/server/revalidate";

function text(value: FormDataEntryValue | null, max: number): string {
  return typeof value === "string" ? value.slice(0, max) : "";
}

/**
 * Guest article submission. Validation, anti-spam, rate limiting and file checks happen in
 * createSubmission(); this action only shapes the form data and the reply.
 */
export async function submitSubmission(_prev: SubmissionFormState, formData: FormData): Promise<SubmissionFormState> {
  const values: SubmissionValues = {
    name: text(formData.get("name"), 80),
    email: text(formData.get("email"), 120),
    affiliation: text(formData.get("affiliation"), 120),
    title: text(formData.get("title"), 200),
    kind: text(formData.get("kind"), 20),
    abstract: text(formData.get("abstract"), 3000),
  };
  const entry = formData.get("file");
  const file = entry instanceof File && entry.size > 0 ? entry : null;

  try {
    const result = await createSubmission({
      name: values.name,
      email: values.email,
      affiliation: values.affiliation,
      title: values.title,
      kind: values.kind,
      abstract: values.abstract,
      file,
      honeypot: formData.get("website"),
      turnstileToken: formData.get("cf-turnstile-response"),
    });
    if (!result.ok) return { status: "error", error: result.error, values };
    revalidateContent(["/admin", "/admin/submissions"]);
    return { status: "received" };
  } catch {
    return {
      status: "error",
      error: "Something went wrong on our side and the submission was not filed. Please try again in a moment, or send it by email.",
      values,
    };
  }
}
