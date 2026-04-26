import type { Metadata } from "next";
import { Footer } from "@/components/Footer";
import { LegalPage } from "@/components/LegalPage";
import {
  PRIVACY_TITLE,
  PRIVACY_INTRO,
  PRIVACY_EFFECTIVE_DATE,
  PRIVACY_SECTIONS,
} from "@/lib/legal/privacy";

export const metadata: Metadata = {
  title: "Privacy Policy — saaspocalypse",
  description:
    "How saaspocalypse collects, uses, shares, and protects your information.",
  robots: { index: true, follow: true },
};

export default function PrivacyPage() {
  return (
    <>
      <LegalPage
        title={PRIVACY_TITLE}
        intro={PRIVACY_INTRO}
        effectiveDate={PRIVACY_EFFECTIVE_DATE}
        sections={PRIVACY_SECTIONS}
      />
      <Footer />
    </>
  );
}
