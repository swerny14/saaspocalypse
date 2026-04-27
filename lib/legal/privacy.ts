import type { LegalSection } from "./types";

export const PRIVACY_TITLE = "Privacy Policy";

export const PRIVACY_VERSION = "2026-04-25";

export const PRIVACY_EFFECTIVE_DATE = PRIVACY_VERSION;

export const PRIVACY_INTRO =
  "Here's the part where we tell you exactly what data we collect, why, and where it goes. Spoiler: way less than you'd think, but more than zero, because the scanner runs on actual servers.";

export const PRIVACY_SECTIONS: LegalSection[] = [
  {
    heading: "1. Introduction & Scope",
    blocks: [
      {
        kind: "p",
        text: "This Privacy Policy describes how WEB3 SOLUTIONS LLC (\"we,\" \"us,\" or \"our\") collects, uses, shares, and protects information in connection with the saaspocalypse website and services (the \"Service\"). It applies to information we receive when you visit the site, submit a URL to the scanner, purchase a build guide, or otherwise interact with us. Our Terms & Conditions are incorporated by reference.",
      },
      {
        kind: "p",
        text: "We are based in the United States. The Service is global, and we have written this Policy with U.S. visitors and visitors located in the European Economic Area, the United Kingdom, and California in mind. Where applicable, we identify rights and disclosures specific to those regions below.",
      },
    ],
  },
  {
    heading: "2. Information We Collect",
    blocks: [
      {
        kind: "p",
        text: "We collect three categories of information:",
      },
      {
        kind: "p",
        text: "Information you provide. This includes: URLs you submit to the scanner; the email address you provide at checkout when purchasing a build guide; the contents of any messages you send us; and any other information you choose to submit.",
      },
      {
        kind: "p",
        text: "Information collected automatically. When you use the Service, we (or our infrastructure providers acting on our behalf) automatically receive: your IP address; request timestamps; basic browser and device information conveyed by HTTP request headers (such as user-agent); and short-lived counters used to enforce rate limits and per-domain locks.",
      },
      {
        kind: "p",
        text: "Information generated about your activity. When the scanner runs, we generate and store an AI-produced verdict report associated with the normalized domain (the registrable, public suffix \"eTLD+1\") of the URL you submitted. If you purchase a build guide, we store a record of the purchase, the email address used, the magic-link token, and the AI-generated guide content. We also write operational events (including error events tied to your scan or purchase) to an internal error log used for debugging.",
      },
      {
        kind: "p",
        text: "Stripe handles your payment-card information directly. We do not receive or store full payment-card numbers, expiration dates, or CVV codes; we receive only what Stripe forwards to us, such as a checkout session identifier and the email address you submit at checkout.",
      },
    ],
  },
  {
    heading: "3. How We Use the Information",
    blocks: [
      {
        kind: "p",
        text: "We use the information described above to:",
      },
      {
        kind: "ul",
        items: [
          "operate, maintain, and improve the Service;",
          "fetch the homepage at the URL you submit and generate a verdict report through our LLM provider;",
          "generate and deliver the build guide you purchased, including issuing a magic-link URL and sending it to you by email;",
          "process payments and prevent fraud through our payment processor;",
          "enforce rate limits, per-domain locks, and abuse-prevention controls;",
          "diagnose problems and triage failures via our internal error log;",
          "communicate with you about your purchase, deliverability issues, or material changes to our Service or policies;",
          "comply with applicable law, respond to lawful requests, and enforce our Terms.",
        ],
      },
      {
        kind: "p",
        text: "Aggregated and de-identified information. We may aggregate or de-identify information so that it no longer reasonably identifies any individual, and we may use and share such aggregated or de-identified information for any lawful purpose, including analytics, research, benchmarking, model and prompt evaluation, public statistics about the scanner (for example, distribution of verdict tiers), and product improvement. We will not attempt to re-identify de-identified information except as permitted by law (for example, to test the effectiveness of de-identification).",
      },
    ],
  },
  {
    heading: "4. Legal Bases for Processing (EEA / UK)",
    blocks: [
      {
        kind: "p",
        text: "If you are located in the European Economic Area or the United Kingdom, we rely on the following legal bases under the GDPR / UK GDPR:",
      },
      {
        kind: "ul",
        items: [
          "Performance of a contract — to deliver the build guide you purchased and otherwise provide the Service you have requested.",
          "Legitimate interests — to operate, secure, and improve the Service, prevent fraud and abuse, run rate limits and locks, and maintain the operational error log. We balance these interests against your rights and freedoms.",
          "Consent — where we ask for it (for example, for any future analytics that requires consent in your region). You can withdraw consent at any time without affecting the lawfulness of prior processing.",
          "Compliance with legal obligation — to keep tax and financial records related to purchases and to respond to lawful requests.",
        ],
      },
    ],
  },
  {
    heading: "5. Cookies & Tracking",
    blocks: [
      {
        kind: "p",
        text: "Today the Service does not run advertising cookies, cross-site tracking pixels, or third-party analytics on its own pages. The Stripe-hosted checkout page sets its own cookies on Stripe's domain to operate the checkout flow; that activity is governed by Stripe's privacy policy.",
      },
      {
        kind: "p",
        text: "If we add analytics, A/B testing, or similar tools in the future, we will update this section, identify the providers, and (where required by law in your region) obtain consent before non-essential cookies or trackers are set.",
      },
      {
        kind: "p",
        text: "Do Not Track. Web browsers can transmit a \"Do Not Track\" (DNT) or Global Privacy Control (GPC) signal. Because there is no industry-standard interpretation of DNT, the Service does not currently respond to DNT signals. Where applicable law requires us to honor a Global Privacy Control signal as an opt-out of \"sale\" or \"sharing,\" we will treat it as such; today we do not engage in conduct that constitutes \"sale\" or \"sharing\" under California law in any case.",
      },
    ],
  },
  {
    heading: "6. Sharing & Sub-processors",
    blocks: [
      {
        kind: "p",
        text: "We do not sell personal information, and we do not \"share\" personal information for cross-context behavioral advertising as those terms are defined under California law. We do disclose information to the following categories of service providers (\"sub-processors\") who process it on our behalf and only for the purposes described in this Policy:",
      },
      {
        kind: "ul",
        items: [
          "Anthropic (LLM inference) — receives the URL you submitted, the cleaned homepage text we extracted from it, and (for paid guides) the verdict report, in order to generate the verdict and the build guide.",
          "Supabase (managed database hosting) — stores reports, build guides, build-guide purchases, and the operational error log.",
          "Stripe (payments) — handles checkout, processes payment-card data, and returns to us a session identifier and the email address you provided.",
          "Resend (transactional email) — delivers the magic-link email containing a URL that grants access to your purchased guide.",
          "Upstash (Redis) — stores short-lived rate-limit counters and per-domain locks keyed on hashed identifiers such as IP address.",
          "Vercel (hosting) — receives all HTTP traffic to the Service and stores standard server logs.",
        ],
      },
      {
        kind: "p",
        text: "We may also disclose information when we believe in good faith that disclosure is necessary to comply with applicable law or legal process, to enforce our Terms, to detect or prevent fraud or abuse, or to protect the rights, property, or safety of WEB3 SOLUTIONS LLC, our users, or the public. If we are involved in a merger, acquisition, financing, reorganization, bankruptcy, or sale of assets, information may be transferred as part of that transaction; we will continue to honor the commitments in this Policy.",
      },
    ],
  },
  {
    heading: "7. International Data Transfers",
    blocks: [
      {
        kind: "p",
        text: "We are based in, and our Service is operated from, the United States. If you access the Service from outside the United States, your information will be transferred to, stored, and processed in the United States and in any other country in which our sub-processors operate. Data-protection laws in those countries may differ from those in your country.",
      },
      {
        kind: "p",
        text: "When we transfer personal data of individuals located in the EEA, the United Kingdom, or Switzerland to a country that has not received an adequacy decision, we rely on appropriate transfer mechanisms — such as Standard Contractual Clauses, the UK International Data Transfer Addendum, or our sub-processors' certification under the EU–U.S. Data Privacy Framework and its UK and Swiss extensions, where applicable.",
      },
    ],
  },
  {
    heading: "8. Data Retention",
    blocks: [
      {
        kind: "p",
        text: "Verdict reports are stored indefinitely as part of a public-facing directory of past scans. The reports are keyed to the normalized public domain you submitted; they are not, by themselves, intended to identify any individual visitor. Public reports may include excerpts, summaries, paraphrases, or other derivatives of the submitted page's content, are accessible to anyone on the internet, may be indexed by search engines, and may be cached or copied by third parties outside our control.",
      },
      {
        kind: "p",
        text: "Build-guide records (including the email address used to purchase, the magic-link token, and a reference to the Stripe session) are retained for as long as the guide remains accessible to you and as long as we are required to keep them for tax, accounting, fraud-prevention, and dispute-resolution purposes.",
      },
      {
        kind: "p",
        text: "Rate-limit and lock counters held in Upstash expire automatically — typically within minutes to hours, and never longer than 24 hours. Operational error-log entries are retained for a target of 90 days for debugging and reliability work; we may extend that window for entries tied to an active incident or a regulatory request.",
      },
    ],
  },
  {
    heading: "9. Your Rights",
    blocks: [
      {
        kind: "p",
        text: "Subject to applicable law and to our ability to verify your identity, you have rights with respect to personal information we hold about you.",
      },
      {
        kind: "p",
        text: "Available to everyone. You may ask us to: confirm whether we hold information about you; provide a copy of that information; correct information that is inaccurate; delete information we hold about you; and provide a portable copy of your purchase records.",
      },
      {
        kind: "p",
        text: "EEA / United Kingdom (GDPR / UK GDPR). In addition to the rights above, you have the right to restrict or object to certain processing, the right to withdraw consent where we rely on consent, and the right to lodge a complaint with your local data-protection authority (such as your national Data Protection Authority in the EEA or the Information Commissioner's Office in the UK). We have not appointed an Article 27 representative; for now, please contact us directly at support@saaspocalypse.dev.",
      },
      {
        kind: "p",
        text: "California (CCPA / CPRA). California residents have the right to know what categories of personal information we collect and how we use them, the right to access and delete personal information we hold about them, the right to correct inaccurate personal information, the right to opt out of any \"sale\" or \"sharing\" of personal information for cross-context behavioral advertising (we do not engage in such sale or sharing), and the right not to be discriminated against for exercising these rights.",
      },
      {
        kind: "p",
        text: "How to exercise your rights. Email us at support@saaspocalypse.dev from the address you used at checkout (or otherwise provide enough detail to locate the relevant records). To protect against unauthorized access, deletion, or modification of someone else's data, we will only fulfill requests where we can reasonably verify that you are the person whose information the request concerns (or are an authorized agent acting on that person's behalf where applicable law permits). For higher-risk requests — such as deletion of a purchase record — we may require additional verification, such as confirmation from the original purchase email or details only the requester would know. We may decline or pause requests that we cannot verify, that are excessive or repetitive, or that conflict with our legal obligations.",
      },
    ],
  },
  {
    heading: "10. URL Submissions & Third-Party Sites",
    blocks: [
      {
        kind: "p",
        text: "When you submit a URL to the scanner, we fetch the publicly accessible HTML at that URL. We do not bypass authentication, paywalls, or other access controls, and we do not submit form fields, log in, or interact with the page beyond a single GET request that follows redirects.",
      },
      {
        kind: "p",
        text: "Do not submit personal or sensitive data. You should not submit URLs that contain, expose, or are likely to expose personal data about other individuals, sensitive personal data (such as health, biometric, financial, government-identifier, precise-location, or children's data), trade secrets, confidential business information, or any other information you do not have the right to share with us, our service providers, and ultimately the public. The Service is not designed to handle such data and is not configured for compliance regimes that govern it (HIPAA, PCI-DSS scope beyond Stripe's role, FERPA, COPPA, and similar).",
      },
      {
        kind: "p",
        text: "You are responsible for the URLs you submit and for any contractual or legal obligations associated with them. We make no representations about the privacy practices, security, or content of any third-party site reached via a submitted URL or via outbound links from generated reports.",
      },
    ],
  },
  {
    heading: "11. Children's Privacy",
    blocks: [
      {
        kind: "p",
        text: "The Service is not directed to children under the age of 13 (or, in the EEA, the age of digital consent in your country, which is typically 13–16). We do not knowingly collect personal information from children below those ages. If you believe a child has provided us with personal information, please contact support@saaspocalypse.dev and we will take steps to delete it.",
      },
    ],
  },
  {
    heading: "12. Security",
    blocks: [
      {
        kind: "p",
        text: "We use commercially reasonable administrative and technical safeguards to protect information processed by the Service. Traffic to the site is served over TLS. Database access is gated by a server-only service-role key that is never exposed to the browser; client-side code uses a separate, restricted anonymous key. Magic-link tokens are random, non-guessable values.",
      },
      {
        kind: "p",
        text: "No method of transmission over the internet or storage system is perfectly secure. We cannot guarantee absolute security, and you use the Service at your own risk.",
      },
    ],
  },
  {
    heading: "13. Changes to This Policy",
    blocks: [
      {
        kind: "p",
        text: "We may update this Policy from time to time. When we do, we will update the Effective Date at the top of this page. For material changes, we will use commercially reasonable efforts to notify you (for example, via a banner on the site or, where we have your email, by email). Continued use of the Service after the change becomes effective means you accept the revised Policy.",
      },
    ],
  },
  {
    heading: "14. Contact",
    blocks: [
      {
        kind: "p",
        text: "If you have questions, requests, or complaints about this Policy or our handling of your information, contact us at support@saaspocalypse.dev.",
      },
    ],
  },
];
