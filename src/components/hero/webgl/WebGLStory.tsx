"use client";

import { useEffect } from "react";

/** PLACEHOLDER — replaced by the WebGL renderer. Must call onReady() once the first frame can be shown. */
export function WebGLStory({ onReady }: { onReady: () => void }) {
  useEffect(() => {
    onReady();
  }, [onReady]);
  return <div className="absolute inset-0 bg-ink" data-renderer="webgl-placeholder" />;
}
