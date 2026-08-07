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

// Regenerate the page at most once an hour; data is baked into the HTML
// so crawlers and AI fetchers see real content without running JS.
export const revalidate = 3600;

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
