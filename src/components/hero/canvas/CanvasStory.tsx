"use client";

import { useEffect } from "react";

/** PLACEHOLDER — replaced by the 2D canvas renderer. Must call onReady() once the first frame can be shown. */
export function CanvasStory({ onReady }: { onReady: () => void }) {
  useEffect(() => {
    onReady();
  }, [onReady]);
  return <div className="absolute inset-0 bg-ink" data-renderer="canvas-placeholder" />;
}
