/**
 * Central site configuration.
 *
 * Everything that identifies the site lives here so it can be changed in ONE place.
 * Values that are secrets or that differ between environments come from
 * environment variables (see .env.example). Non-secret defaults are inlined.
 *
 * NOTE: Only variables prefixed with NEXT_PUBLIC_ are visible to the browser.
 */

const env = (key: string, fallback: string): string => {
  const value = process.env[key];
  return value && value.trim().length > 0 ? value.trim() : fallback;
};

export const siteConfig = {
  /** Short brand name used in the wordmark and titles. */
  name: "YourIPLawyer",
  /** Long-form name used in metadata. */
  fullName: "YourIPLawyer — Adv. Rohit Pradhan",
  /** Canonical production origin. No trailing slash. */
  url: env("NEXT_PUBLIC_SITE_URL", "https://youriplawyer.in"),
  /** One-line description used for default metadata. */
  description:
    "YourIPLawyer is the personal platform, publication and community of Adv. Rohit Pradhan, an IP litigation lawyer in Delhi: commentary, case analysis and discussion on intellectual property law in India.",
  tagline: "Intellectual property. Without the boring part.",
  locale: "en_IN",

  author: {
    name: "Adv. Rohit Pradhan",
    shortName: "Rohit Pradhan",
    title: "IP Litigation Lawyer",
    location: "Delhi, India",
    /** Used in structured data and the About page. Keep factual. */
    bio: "IP litigation lawyer based in Delhi, India. Writes about intellectual property law, litigation and dispute resolution.",
  },

  /** Public contact email. Change it in .env (NEXT_PUBLIC_CONTACT_EMAIL) — never hard-code it elsewhere. */
  contactEmail: env("NEXT_PUBLIC_CONTACT_EMAIL", "hello@youriplawyer.in"),
  /** Where article submissions are sent. Defaults to the contact email. */
  submissionsEmail: env("NEXT_PUBLIC_SUBMISSIONS_EMAIL", env("NEXT_PUBLIC_CONTACT_EMAIL", "hello@youriplawyer.in")),

  /** Social links. Leave a value empty ("") to hide it. */
  social: {
    linkedin: env("NEXT_PUBLIC_SOCIAL_LINKEDIN", ""),
    x: env("NEXT_PUBLIC_SOCIAL_X", ""),
    instagram: env("NEXT_PUBLIC_SOCIAL_INSTAGRAM", ""),
  },

  /** Primary navigation, in order. */
  nav: [
    { href: "/", label: "Home" },
    { href: "/about", label: "About" },
    { href: "/blog", label: "Blog" },
    { href: "/forum", label: "Forum" },
    { href: "/submission-guidelines", label: "Submissions" },
    { href: "/contact", label: "Contact" },
  ] as const,

  /** Optional analytics. Leave empty to disable. */
  analytics: {
    plausibleDomain: env("NEXT_PUBLIC_PLAUSIBLE_DOMAIN", ""),
  },

  /** Cloudflare Turnstile site key (public). Empty disables the widget. */
  turnstileSiteKey: env("NEXT_PUBLIC_TURNSTILE_SITE_KEY", ""),

  /** Recurring footer lines. */
  footer: {
    lines: [
      "AI can draft. A lawyer still has to think.",
      "AI can produce the words. Unfortunately, someone still has to have the legal brain.",
    ],
    jurisdictionHeading: "A note on jurisdiction",
    jurisdiction:
      "Should this website ever find itself a party to litigation, the Hon'ble Delhi High Court would be greatly appreciated. Its creator lives and works in Delhi, and taking leave for proceedings elsewhere could become an unfortunate logistical dispute of its own.",
  },

  disclaimer: {
    general:
      "The material published on YourIPLawyer is intended for general informational and educational purposes only. It does not constitute legal advice and does not create a lawyer–client relationship.",
    forum:
      "Views expressed by forum participants are their own and do not necessarily represent the views of YourIPLawyer or its contributors.",
    demoContent:
      "This is demonstration content created to illustrate the platform. It is not legal advice and should not be relied upon.",
  },
} as const;

export type SiteConfig = typeof siteConfig;

/** Absolute URL helper for metadata, sitemaps and structured data. */
export function absoluteUrl(path = "/"): string {
  const base = siteConfig.url.replace(/\/$/, "");
  return path.startsWith("/") ? `${base}${path}` : `${base}/${path}`;
}
