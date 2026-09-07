import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Small, reusable UI atoms shared by every page                        */
/* ------------------------------------------------------------------ */

export function Eyebrow({ children, className, muted }: { children: ReactNode; className?: string; muted?: boolean }) {
  return <p className={cn(muted ? "eyebrow-muted" : "eyebrow", className)}>{children}</p>;
}

export function SectionHeading({
  eyebrow,
  title,
  lede,
  align = "left",
  className,
  as: Tag = "h2",
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  lede?: ReactNode;
  align?: "left" | "center";
  className?: string;
  as?: "h1" | "h2" | "h3";
}) {
  return (
    <div className={cn("max-w-3xl", align === "center" && "mx-auto text-center", className)}>
      {eyebrow ? <Eyebrow className="mb-4">{eyebrow}</Eyebrow> : null}
      <Tag className="display-md">{title}</Tag>
      {lede ? <p className="lede mt-5 max-w-2xl opacity-90">{lede}</p> : null}
    </div>
  );
}

type ButtonVariant = "outline" | "solid" | "seal" | "ghost";

export function Button({
  variant = "outline",
  size,
  className,
  children,
  ...rest
}: ComponentProps<"button"> & { variant?: ButtonVariant; size?: "sm" }) {
  return (
    <button
      className={cn("btn", variant === "solid" && "btn-solid", variant === "seal" && "btn-seal", variant === "ghost" && "btn-ghost", size === "sm" && "btn-sm", className)}
      {...rest}
    >
      {children}
    </button>
  );
}

export function ButtonLink({
  variant = "outline",
  size,
  className,
  children,
  href,
  ...rest
}: Omit<ComponentProps<typeof Link>, "href"> & { href: string; variant?: ButtonVariant; size?: "sm" }) {
  return (
    <Link
      href={href}
      className={cn("btn", variant === "solid" && "btn-solid", variant === "seal" && "btn-seal", variant === "ghost" && "btn-ghost", size === "sm" && "btn-sm", className)}
      {...rest}
    >
      {children}
    </Link>
  );
}

export function Arrow({ className, direction = "right" }: { className?: string; direction?: "right" | "left" | "up" | "down" }) {
  const rotate = { right: 0, down: 90, left: 180, up: 270 }[direction];
  return (
    <svg aria-hidden="true" width="14" height="10" viewBox="0 0 14 10" className={className} style={{ transform: `rotate(${rotate}deg)` }}>
      <path d="M0 5h12M8 1l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

export function Chip({ children, className, href }: { children: ReactNode; className?: string; href?: string }) {
  if (href) {
    return (
      <Link href={href} className={cn("chip transition-colors hover:border-current hover:text-bronze-2", className)}>
        {children}
      </Link>
    );
  }
  return <span className={cn("chip", className)}>{children}</span>;
}

export function Divider({ className, solid }: { className?: string; solid?: boolean }) {
  return <div className={cn(solid ? "rule-solid" : "rule", className)} role="presentation" />;
}

export function DemoBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn("chip border-seal-2/60 text-seal-2", className)}
      title="This is demonstration content created to illustrate the platform. It is not legal advice."
    >
      Demo content
    </span>
  );
}

export function Notice({ tone = "info", children, className }: { tone?: "info" | "success" | "error"; children: ReactNode; className?: string }) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "border-l-2 px-4 py-3 text-sm",
        tone === "info" && "border-bronze bg-bronze/8",
        tone === "success" && "border-bronze-2 bg-bronze/10",
        tone === "error" && "border-seal-2 bg-seal/15",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function EmptyState({ title, body, action, className }: { title: ReactNode; body?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("plate px-8 py-16 text-center", className)}>
      <p className="display-sm">{title}</p>
      {body ? <p className="mt-3 text-sm opacity-70">{body}</p> : null}
      {action ? <div className="mt-8 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function Field({
  label,
  hint,
  htmlFor,
  required,
  children,
  className,
}: {
  label: ReactNode;
  hint?: ReactNode;
  htmlFor: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <label htmlFor={htmlFor} className="eyebrow-muted block">
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </label>
      {children}
      {hint ? <p className="text-xs opacity-60">{hint}</p> : null}
    </div>
  );
}

/** Invisible honeypot field for bots. Real users never see it. */
export function Honeypot() {
  return (
    <div aria-hidden="true" className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden">
      <label htmlFor="website-hp">Website</label>
      <input id="website-hp" type="text" name="website" tabIndex={-1} autoComplete="off" />
    </div>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="rounded border border-current/30 px-1.5 py-0.5 font-mono text-[0.65rem]">{children}</kbd>;
}
