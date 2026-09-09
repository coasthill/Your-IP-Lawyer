import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Small preview for an uploaded image. `unoptimized` so any storage host works without
 * touching next.config; these are admin-only thumbnails, not public assets.
 */
export function Thumb({ src, alt, size = 56, className }: { src: string; alt: string; size?: number; className?: string }) {
  return (
    <span className={cn("block shrink-0 overflow-hidden border bg-vellum", className)} style={{ width: size, height: size }}>
      <Image src={src} alt={alt} width={size} height={size} unoptimized className="h-full w-full object-cover" />
    </span>
  );
}

/** Placeholder for non-image documents. */
export function FileGlyph({ label, size = 56 }: { label: string; size?: number }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center border bg-vellum font-mono text-[0.58rem] uppercase tracking-[0.12em] text-lapis"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {label}
    </span>
  );
}
