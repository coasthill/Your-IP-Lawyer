"use client";

import { useId, useState } from "react";

/** Inline PDF preview behind a toggle, so the article never loads a viewer until asked. */
export function PdfPreview({ url, title }: { url: string; title: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <div className="mt-4 sm:pl-12">
      <button type="button" className="btn btn-sm btn-ghost" aria-expanded={open} aria-controls={id} onClick={() => setOpen((v) => !v)}>
        {open ? "Hide preview" : "Preview"}
      </button>
      <div id={id} hidden={!open} className="mt-4 border bg-vellum">
        {open ? (
          <>
            <iframe src={url} title={`Preview of ${title}`} loading="lazy" className="block h-[70vh] w-full bg-white" />
            <p className="px-4 py-3 text-xs text-ash">If the preview does not render in your browser, use Open or Download above.</p>
          </>
        ) : null}
      </div>
    </div>
  );
}
