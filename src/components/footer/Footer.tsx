import Link from "next/link";
import { siteConfig } from "@/config/site";

const explore = [
  { href: "/blog", label: "Blog" },
  { href: "/forum", label: "The IP Forum" },
  { href: "/submission-guidelines", label: "Submission guidelines" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
  { href: "/disclaimer", label: "Disclaimer" },
];

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="relative border-t border-bronze/15 bg-ink" role="contentinfo">
      <div className="container-editorial py-16 md:py-20">
        <div className="grid gap-12 md:grid-cols-12">
          <div className="md:col-span-5">
            <p className="eyebrow">{siteConfig.author.name}</p>
            <p className="mt-2 font-display text-3xl tracking-[0.12em] text-ivory uppercase">{siteConfig.name}</p>
            <p className="mt-6 max-w-sm font-display text-xl leading-snug text-parchment/85">{siteConfig.footer.lines[0]}</p>
            <p className="mt-3 max-w-sm text-sm text-bone/70">{siteConfig.footer.lines[1]}</p>
          </div>

          <div className="md:col-span-3">
            <p className="eyebrow-muted mb-5">Explore</p>
            <ul className="space-y-3">
              {explore.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="link-underline text-sm text-parchment/85 hover:text-ivory">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="md:col-span-4">
            <p className="eyebrow-muted mb-5">Have something to say?</p>
            <a href={`mailto:${siteConfig.contactEmail}`} className="link-underline font-display text-2xl text-ivory">
              {siteConfig.contactEmail}
            </a>
            <p className="mt-6 text-xs leading-relaxed text-bone/60">{siteConfig.disclaimer.general}</p>
            <p className="mt-3 text-xs leading-relaxed text-bone/60">{siteConfig.disclaimer.forum}</p>
          </div>
        </div>

        <div className="rule my-12" role="presentation" />

        <div className="grid gap-8 md:grid-cols-12 md:items-end">
          <div className="md:col-span-8">
            <p className="eyebrow-muted mb-3">{siteConfig.footer.jurisdictionHeading}</p>
            <p className="max-w-2xl font-display text-base italic leading-relaxed text-parchment/75">{siteConfig.footer.jurisdiction}</p>
          </div>
          <div className="flex flex-col items-start gap-3 md:col-span-4 md:items-end">
            <a href="#top" className="btn btn-sm">
              Back to the record
            </a>
            <p className="font-mono text-[0.62rem] uppercase tracking-[0.2em] text-ash">
              © {year} {siteConfig.author.name} · {siteConfig.author.location}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
