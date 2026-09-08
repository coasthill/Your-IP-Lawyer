import { Navigation } from "@/components/navigation/Navigation";
import { Footer } from "@/components/footer/Footer";
import SiteNotFound from "./(site)/not-found";

/**
 * Root 404 — reached for URLs that match no route at all. Wraps the site's 404 in the site chrome
 * (no smooth-scroll provider needed on a single-screen page).
 */
export default function NotFound() {
  return (
    <>
      <Navigation />
      <main id="main" className="flex-1">
        <SiteNotFound />
      </main>
      <Footer />
    </>
  );
}
