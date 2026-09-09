"use client";

import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Loading sequence: YOURIPLAWYER → INTELLECTUAL PROPERTY. LITIGATION. IDEAS. → the painting fades in.
 * Total ≈ 2.2s, and it never blocks longer than 3.5s even if the first painting is still arriving.
 */
export function Loader({ ready, onDone }: { ready: boolean; onDone: () => void }) {
  const [phase, setPhase] = useState(0);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const t1 = window.setTimeout(() => setPhase(1), 700);
    const t2 = window.setTimeout(() => setPhase(2), 1700);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, []);

  const finish = useCallback(() => {
    setGone(true);
    window.setTimeout(onDone, 900);
  }, [onDone]);

  useEffect(() => {
    if (phase < 2) return;
    const deadline = window.setTimeout(finish, ready ? 250 : 1500);
    return () => window.clearTimeout(deadline);
  }, [phase, ready, finish]);

  return (
    <div
      aria-live="polite"
      aria-busy={!gone}
      className={cn(
        "fixed inset-0 z-[80] flex flex-col items-center justify-center bg-lapis-4 text-ivory transition-opacity duration-[900ms] ease-[var(--ease-cinematic)]",
        gone && "pointer-events-none opacity-0",
      )}
    >
      <span className="reg-mark absolute left-[var(--page-x)] top-8 text-bronze-2" aria-hidden="true" />
      <span className="reg-mark absolute right-[var(--page-x)] top-8 text-bronze-2" aria-hidden="true" />
      <span className="reg-mark absolute bottom-8 left-[var(--page-x)] text-bronze-2" aria-hidden="true" />
      <span className="reg-mark absolute bottom-8 right-[var(--page-x)] text-bronze-2" aria-hidden="true" />
      <p className={cn("font-display text-[clamp(1.6rem,4vw,3rem)] uppercase tracking-[0.3em] transition-all duration-700", phase >= 1 ? "-translate-y-6 scale-95 opacity-60" : "opacity-100")}>
        YourIPLawyer
      </p>
      <div className={cn("mt-6 flex flex-col items-center gap-1 font-mono text-[0.7rem] uppercase tracking-[0.3em] text-bronze-2 transition-opacity duration-700", phase >= 1 ? "opacity-100" : "opacity-0")}>
        <span className={cn("transition-all duration-500", phase >= 1 ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0")}>Intellectual property.</span>
        <span className={cn("transition-all delay-150 duration-500", phase >= 1 ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0")}>Litigation.</span>
        <span className={cn("transition-all delay-300 duration-500", phase >= 1 ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0")}>Ideas.</span>
      </div>
      <div className="absolute bottom-10 h-px w-24 overflow-hidden bg-ivory/15">
        <div className={cn("h-full bg-bronze-2 transition-[width] duration-[1600ms] ease-linear", phase >= 1 ? "w-full" : "w-0")} />
      </div>
    </div>
  );
}
