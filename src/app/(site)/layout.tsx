import { Navigation } from "@/components/navigation/Navigation";
import { Footer } from "@/components/footer/Footer";
import { SmoothScroll } from "@/components/ui/SmoothScroll";
import { siteConfig, absoluteUrl } from "@/config/site";

function SiteJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": absoluteUrl("/#website"),
        url: siteConfig.url,
        name: siteConfig.name,
        description: siteConfig.description,
        inLanguage: "en-IN",
        publisher: { "@id": absoluteUrl("/#person") },
      },
      {
        "@type": "Person",
        "@id": absoluteUrl("/#person"),
        name: siteConfig.author.name,
        jobTitle: siteConfig.author.title,
        description: siteConfig.author.bio,
        url: absoluteUrl("/about"),
        address: { "@type": "PostalAddress", addressLocality: "Delhi", addressCountry: "IN" },
        sameAs: Object.values(siteConfig.social).filter(Boolean),
      },
    ],
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <SmoothScroll>
      <SiteJsonLd />
      <Navigation />
      <main id="main" className="flex-1">
        {children}
      </main>
      <Footer />
    </SmoothScroll>
  );
}
