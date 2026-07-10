import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import Features from "./components/Features";
import DeveloperCards from "./components/DeveloperCards";
import HowItWorks from "./components/HowItWorks";
import Stats from "./components/Stats";
import CTA from "./components/CTA";
import Footer from "./components/Footer";

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <Features />
        <DeveloperCards />
        <HowItWorks />
        <Stats />
        <CTA />
      </main>
      <Footer />
    </>
  );
}
