import type { Metadata, Viewport } from "next";
import { fontClassNames } from "./fonts";
import { siteConfig, absoluteUrl } from "@/config/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} — ${siteConfig.author.name}, ${siteConfig.author.title}, ${siteConfig.author.location}`,
    template: `%s — ${siteConfig.name}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  authors: [{ name: siteConfig.author.name, url: absoluteUrl("/about") }],
  creator: siteConfig.author.name,
  keywords: ["intellectual property", "IP law", "IP litigation", "trade marks", "patents", "copyright", "designs", "geographical indications", "Delhi", "India", "Rohit Pradhan"],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: siteConfig.locale,
    siteName: siteConfig.name,
    url: siteConfig.url,
    title: `${siteConfig.name} — ${siteConfig.author.name}`,
    description: siteConfig.description,
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteConfig.name} — ${siteConfig.author.name}`,
    description: siteConfig.description,
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#09090b",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-IN" className={`${fontClassNames} h-full antialiased`} id="top">
      <body className="min-h-full flex flex-col">
        {children}
        {siteConfig.analytics.plausibleDomain ? (
          <script defer data-domain={siteConfig.analytics.plausibleDomain} src="https://plausible.io/js/script.js" />
        ) : null}
      </body>
    </html>
  );
}
