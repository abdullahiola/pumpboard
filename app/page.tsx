import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import Features from "./components/Features";
import DeveloperCards from "./components/DeveloperCards";
import JournalTeaser from "./components/JournalTeaser";
import JournalBanner from "./components/JournalBanner";
import HowItWorks from "./components/HowItWorks";
import Transparency from "./components/Transparency";
import Stats from "./components/Stats";
import FAQ from "./components/FAQ";
import CTA from "./components/CTA";
import Footer from "./components/Footer";
import { getDevelopers, getStats, getStories } from "./lib/api";

// Render at request time so the HTML always carries real data for crawlers
// and AI fetchers. Prerendering at build time bakes in an empty page because
// the backend isn't reachable during docker build. The API responses are
// still cached for an hour by the fetch calls in lib/api.ts.
export const dynamic = "force-dynamic";

export default async function Home() {
  const [stats, developers, stories] = await Promise.all([
    getStats(),
    getDevelopers(),
    getStories(),
  ]);

  return (
    <>
      <Navbar />
      <main>
        <Hero initialStats={stats} />
        <JournalBanner
          stories={stories?.slice(0, 3).map(({ slug, title }) => ({ slug, title })) ?? null}
        />
        <Features />
        <DeveloperCards initialDevelopers={developers} />
        <JournalTeaser stories={stories} />
        <HowItWorks />
        <Transparency />
        <Stats
          initialStats={stats}
          projects={
            developers
              ?.filter((d) => d.repo)
              .map(({ github, name, repo, repo_url, project_icon, totalClaimed }) => ({
                github,
                name,
                repo,
                repo_url,
                project_icon,
                totalClaimed,
              })) ?? null
          }
        />
        <FAQ />
        <CTA />
      </main>
      <Footer />
    </>
  );
}
