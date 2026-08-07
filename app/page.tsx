import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import Features from "./components/Features";
import DeveloperCards from "./components/DeveloperCards";
import HowItWorks from "./components/HowItWorks";
import Transparency from "./components/Transparency";
import Stats from "./components/Stats";
import FAQ from "./components/FAQ";
import CTA from "./components/CTA";
import Footer from "./components/Footer";
import { getDevelopers, getStats } from "./lib/api";

// Render at request time so the HTML always carries real data for crawlers
// and AI fetchers. Prerendering at build time bakes in an empty page because
// the backend isn't reachable during docker build. The API responses are
// still cached for an hour by the fetch calls in lib/api.ts.
export const dynamic = "force-dynamic";

export default async function Home() {
  const [stats, developers] = await Promise.all([getStats(), getDevelopers()]);

  return (
    <>
      <Navbar />
      <main>
        <Hero initialStats={stats} />
        <Features />
        <DeveloperCards initialDevelopers={developers} />
        <HowItWorks />
        <Transparency />
        <Stats initialStats={stats} />
        <FAQ />
        <CTA />
      </main>
      <Footer />
    </>
  );
}
