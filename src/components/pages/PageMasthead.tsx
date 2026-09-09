import type { ReactNode } from "react";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

/**
 * Masthead shared by the editorial static pages: eyebrow → display headline → lede, with an
 * optional "record" block on the right, in the register of the blog index. Paper by default;
 * pass `className="surface-lapis"` for a blue masthead. Frame lines at the page margins and a
 * registration mark beside the eyebrow: the technical-drawing furniture of the house style.
 */
export function PageMasthead({
  eyebrow,
  title,
  lede,
  size = "lg",
  record,
  titleId = "page-title",
  children,
  className,
}: {
  eyebrow: ReactNode;
  title: ReactNode;
  lede?: ReactNode;
  size?: "xl" | "lg";
  record?: { label: ReactNode; value: ReactNode; note?: ReactNode };
  titleId?: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("relative frame-lines max-md:before:hidden max-md:after:hidden", className)} aria-labelledby={titleId}>
      <div className="container-editorial pt-10 pb-12 md:pt-16 md:pb-14">
        <div className="grid gap-10 md:grid-cols-12 md:items-end">
          <div className={record ? "md:col-span-8" : "md:col-span-10"}>
            <p className="eyebrow flex items-center gap-3">
              <span className="reg-mark" aria-hidden="true" />
              {eyebrow}
            </p>
            <h1 id={titleId} className={cn("mt-5", size === "xl" ? "display-xl" : "display-lg")}>
              {title}
            </h1>
            {lede ? <p className="lede mt-6 max-w-2xl">{lede}</p> : null}
          </div>
          {record ? (
            <div className="md:col-span-4 md:text-right">
              <p className="eyebrow-muted">{record.label}</p>
              <p className="mt-2 font-display text-xl">{record.value}</p>
              <p className="eyebrow-muted mt-1">{record.note ?? `${siteConfig.author.location} · ${siteConfig.name}`}</p>
            </div>
          ) : null}
        </div>
        {children}
        <div className="rule-solid mt-12" role="presentation" />
      </div>
    </section>
  );
}
