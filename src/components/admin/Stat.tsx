import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Record-style statistic: numbered mono label above a large serif figure. Divided by hairlines, not cards. */
export function StatGrid({ children }: { children: ReactNode }) {
  return <dl className="grid grid-cols-2 border-y md:grid-cols-3 lg:grid-cols-6">{children}</dl>;
}

export function Stat({ number, label, value, href, tone = "default" }: { number: string; label: ReactNode; value: number | string; href?: string; tone?: "default" | "attention" }) {
  const inner = (
    <>
      <dt className="flex items-baseline gap-2 font-mono text-[0.62rem] uppercase tracking-[0.18em] text-ash">
        <span className="text-lapis" aria-hidden="true">
          {number}
        </span>
        {label}
      </dt>
      <dd className={cn("mt-3 font-display text-4xl leading-none tabular-nums", tone === "attention" && Number(value) > 0 ? "text-lapis" : "text-ink")}>{value}</dd>
    </>
  );
  const cls = "block border-b px-4 py-5 md:border-b-0 md:border-r md:last:border-r-0 [&:nth-child(2n)]:border-r-0 md:[&:nth-child(2n)]:border-r";
  return href ? (
    <Link href={href} className={cn(cls, "transition-colors hover:bg-lapis-tint")}>
      {inner}
    </Link>
  ) : (
    <div className={cls}>{inner}</div>
  );
}
