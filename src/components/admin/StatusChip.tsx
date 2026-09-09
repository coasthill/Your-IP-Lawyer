import { cn } from "@/lib/utils";

/* Published/approved = lapis outline; draft/hidden = ash; held (pending, new, reviewing) = gold; spam/declined = seal. */
const TONES: Record<string, string> = {
  published: "border-lapis/60 text-lapis",
  approved: "border-lapis/60 text-lapis",
  accepted: "border-lapis/60 text-lapis",
  draft: "border-ash/60 text-ash",
  pending: "border-bronze text-bronze-dim",
  new: "border-bronze text-bronze-dim",
  reviewing: "border-bronze text-bronze-dim",
  hidden: "border-ash/60 text-ash",
  declined: "border-seal/60 text-seal",
  spam: "border-seal/60 text-seal",
};

/** Status label — the word is always shown, colour is only a reinforcement. */
export function StatusChip({ status, className }: { status: string; className?: string }) {
  return <span className={cn("chip", TONES[status] ?? "text-slate", className)}>{status}</span>;
}

export function FlagChip({ children, tone = "default", className }: { children: React.ReactNode; tone?: "default" | "seal" | "bronze"; className?: string }) {
  return <span className={cn("chip", tone === "seal" && "border-seal/60 text-seal", tone === "bronze" && "border-bronze text-bronze-dim", className)}>{children}</span>;
}
