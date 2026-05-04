import { Hero } from "@/components/Hero";
import { Marquee } from "@/components/Marquee";
import { MiniLeaderboard } from "@/components/MiniLeaderboard";
import { HowItWorks } from "@/components/HowItWorks";
import { Testimonials } from "@/components/Testimonials";
import { Pricing } from "@/components/Pricing";
import { FAQ } from "@/components/FAQ";
import { CTA } from "@/components/CTA";
import { Footer } from "@/components/Footer";
import { landingJsonLd, serializeJsonLd } from "@/lib/seo/jsonld";

export default function Home() {
  return (
    <>
      <Hero />
      <Marquee />
      <MiniLeaderboard />
      <HowItWorks />
      <Testimonials />
      <Pricing />
      <FAQ />
      <CTA />
      <Footer />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(landingJsonLd()) }}
      />
    </>
  );
}
