import localFont from "next/font/local";

/**
 * Typography system — three faces, self-hosted (no runtime request to Google Fonts).
 *   display : Cormorant Garamond (high-contrast editorial serif)
 *   body    : DM Sans (clean modern sans, optical-size axis)
 *   mono    : IBM Plex Mono (tiny labels, case numbers, "record" microcopy only)
 */
export const fontDisplay = localFont({
  src: [
    { path: "./fonts/cormorant-latin-wght-normal.woff2", style: "normal", weight: "300 700" },
    { path: "./fonts/cormorant-latin-wght-italic.woff2", style: "italic", weight: "300 700" },
  ],
  variable: "--font-display",
  display: "swap",
  fallback: ["Georgia", "Times New Roman", "serif"],
  adjustFontFallback: "Times New Roman",
});

export const fontBody = localFont({
  src: [
    { path: "./fonts/dm-sans-latin-opsz-normal.woff2", style: "normal", weight: "100 1000" },
    { path: "./fonts/dm-sans-latin-opsz-italic.woff2", style: "italic", weight: "100 1000" },
  ],
  variable: "--font-body",
  display: "swap",
  fallback: ["system-ui", "Segoe UI", "Helvetica Neue", "Arial", "sans-serif"],
  adjustFontFallback: "Arial",
});

export const fontMono = localFont({
  src: [
    { path: "./fonts/ibm-plex-mono-latin-400-normal.woff2", style: "normal", weight: "400" },
    { path: "./fonts/ibm-plex-mono-latin-500-normal.woff2", style: "normal", weight: "500" },
  ],
  variable: "--font-mono",
  display: "swap",
  fallback: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
});

export const fontClassNames = `${fontDisplay.variable} ${fontBody.variable} ${fontMono.variable}`;
