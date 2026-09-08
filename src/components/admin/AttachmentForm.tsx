"use client";

import { useActionState, useId, useState } from "react";
import { Notice } from "@/components/ui/primitives";
import { FormField } from "./FormBits";
import { idleFormState, type FormState } from "./form-state";

export type AttachableDoc = { id: string; label: string };

/** Attach a PDF/Word file to an article: upload a new one or pick one already in the library. */
export function AttachmentForm({ action, library }: { action: (prev: FormState, formData: FormData) => Promise<FormState>; library: AttachableDoc[] }) {
  const [state, formAction, pending] = useActionState(action, idleFormState);
  const [source, setSource] = useState<"upload" | "library">("upload");
  const uid = useId();

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {state.status === "error" ? <Notice tone="error">{state.message}</Notice> : null}
      {state.status === "success" ? <Notice tone="success">{state.message}</Notice> : null}

      <div className="flex flex-wrap gap-5" role="radiogroup" aria-label="Source">
        <label className="flex items-center gap-2 text-sm">
          <input type="radio" name="source" value="upload" checked={source === "upload"} onChange={() => setSource("upload")} className="h-4 w-4 accent-bronze-2" />
          Upload a file
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="radio" name="source" value="library" checked={source === "library"} onChange={() => setSource("library")} className="h-4 w-4 accent-bronze-2" />
          From the library
        </label>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {source === "upload" ? (
          <FormField label="File" htmlFor={`${uid}-file`} required hint="PDF or Word (.doc, .docx) up to 25 MB.">
            <input id={`${uid}-file`} name="file" type="file" accept="application/pdf,.pdf,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="text-sm file:mr-3 file:border file:border-bronze/40 file:bg-transparent file:px-3 file:py-1.5 file:font-mono file:text-[0.62rem] file:uppercase file:tracking-[0.16em] file:text-ivory" />
          </FormField>
        ) : (
          <FormField label="Document" htmlFor={`${uid}-doc`} required hint={library.length ? undefined : "No PDFs or Word files in the library yet."}>
            <select id={`${uid}-doc`} name="documentId" defaultValue="">
              <option value="">— choose —</option>
              {library.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </select>
          </FormField>
        )}
        <FormField label="Label" htmlFor={`${uid}-label`} hint="Shown to readers, e.g. “Full case note (PDF)”.">
          <input id={`${uid}-label`} name="label" defaultValue={state.values?.label ?? ""} maxLength={120} />
        </FormField>
      </div>

      <button type="submit" className="btn btn-sm" disabled={pending} aria-busy={pending || undefined}>
        {pending ? "Attaching…" : "Attach"}
      </button>
    </form>
  );
}
