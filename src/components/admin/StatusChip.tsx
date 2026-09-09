import { cn } from "@/lib/utils";

const TONES: Record<string, string> = {
  published: "border-bronze-2/60 text-bronze-2",
  approved: "border-bronze-2/60 text-bronze-2",
  accepted: "border-bronze-2/60 text-bronze-2",
  draft: "border-bone/40 text-bone",
  pending: "border-parchment/50 text-parchment",
  new: "border-parchment/50 text-parchment",
  reviewing: "border-bone/40 text-bone",
  hidden: "border-ash/60 text-ash",
  declined: "border-ash/60 text-ash",
  spam: "border-seal-2/60 text-seal-2",
};

/** Status label — the word is always shown, colour is only a reinforcement. */
export function StatusChip({ status, className }: { status: string; className?: string }) {
  return <span className={cn("chip", TONES[status] ?? "text-bone", className)}>{status}</span>;
}

export function FlagChip({ children, tone = "default", className }: { children: React.ReactNode; tone?: "default" | "seal" | "bronze"; className?: string }) {
  return <span className={cn("chip", tone === "seal" && "border-seal-2/60 text-seal-2", tone === "bronze" && "border-bronze-2/60 text-bronze-2", className)}>{children}</span>;
}
