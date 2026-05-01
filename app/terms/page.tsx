import type { Metadata } from "next";
import { Footer } from "@/components/Footer";
import { LegalPage } from "@/components/LegalPage";
import {
  TERMS_TITLE,
  TERMS_INTRO,
  TERMS_EFFECTIVE_DATE,
  TERMS_SECTIONS,
} from "@/lib/legal/terms";

export const metadata: Metadata = {
  title: "Terms & Conditions — saaspocalypse",
  description:
    "The rules for using saaspocalypse — the free scanner and the paid wedge guides.",
  robots: { index: true, follow: true },
};

export default function TermsPage() {
  return (
    <>
      <LegalPage
        title={TERMS_TITLE}
        intro={TERMS_INTRO}
        effectiveDate={TERMS_EFFECTIVE_DATE}
        sections={TERMS_SECTIONS}
      />
      <Footer />
    </>
  );
}
