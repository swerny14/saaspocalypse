import type { LegalSection } from "./types";

export const TERMS_TITLE = "Terms & Conditions";

export const TERMS_VERSION = "2026-04-25";

export const TERMS_EFFECTIVE_DATE = TERMS_VERSION;

export const TERMS_INTRO =
  "These are the boring rules that keep the not-boring jokes online. Read them — or don't, but legally we still need you to have had the chance.";

export const TERMS_SECTIONS: LegalSection[] = [
  {
    heading: "1. Acceptance of Terms",
    blocks: [
      {
        kind: "p",
        text: "Welcome to saaspocalypse (the \"Service\"), operated by WEB3 SOLUTIONS LLC (\"we,\" \"us,\" or \"our\"). These Terms & Conditions (\"Terms\") govern your access to and use of the websites, scanner, build guides, and any related features we provide. By accessing or using the Service, you agree to be bound by these Terms and our Privacy Policy. If you do not agree, you must not use the Service.",
      },
      {
        kind: "p",
        text: "We may update these Terms from time to time. The \"Effective Date\" above tells you when the current version went into effect. Continued use of the Service after a change means you accept the updated Terms.",
      },
    ],
  },
  {
    heading: "2. What saaspocalypse Is",
    blocks: [
      {
        kind: "p",
        text: "saaspocalypse offers two things. First, a free \"scanner\" that accepts a publicly accessible URL you submit, fetches the homepage, and uses a large language model to produce an opinionated buildability report — a tier verdict, an estimated time-to-clone, an inferred technology stack, identified challenges, and a snarky one-liner. Second, an optional paid \"build guide\" — a written, AI-generated walkthrough of how a builder might attempt to construct a comparable product, including suggested prompts and pitfalls.",
      },
      {
        kind: "p",
        text: "Both outputs are AI-generated, opinion-based commentary intended for entertainment and ideation only. They are not professional, legal, financial, security, or business advice, and they should not be relied on as a feasibility study, a market analysis, or a substitute for due diligence.",
      },
    ],
  },
  {
    heading: "3. Eligibility",
    blocks: [
      {
        kind: "p",
        text: "You must be at least 18 years old to purchase a build guide or otherwise enter into a paid transaction with us. If you are under 18, you may use the free scanner only with the involvement and permission of a parent or legal guardian. By using the Service, you represent that you meet these requirements and that you have the legal capacity to agree to these Terms.",
      },
    ],
  },
  {
    heading: "4. Account & Access",
    blocks: [
      {
        kind: "p",
        text: "saaspocalypse does not require user accounts. We enforce these Terms primarily through technical controls applied to your IP address (rate limits, per-domain locks, abuse prevention) and to the email address you provide when purchasing a build guide (magic-link delivery and access). By using the Service, you consent to those controls. You agree not to evade, manipulate, or circumvent them — for example, by rotating IP addresses, abusing multiple email addresses, or sharing magic links to bypass per-purchase access.",
      },
    ],
  },
  {
    heading: "5. The Free Scan Service",
    blocks: [
      {
        kind: "p",
        text: "The scanner produces an automated, AI-generated estimate based on a snapshot of publicly available information. We do not promise that any verdict, score, time estimate, stack inference, or commentary is accurate, complete, current, or fit for any particular purpose. Outputs are opinion-based commentary, not statements of fact, and may contain errors, omissions, or fabrications (\"hallucinations\") that are characteristic of large language models.",
      },
      {
        kind: "p",
        text: "Confidentiality of submitted URLs. You should not submit URLs that point to confidential, proprietary, internal-only, sensitive, or non-public resources. Even when a URL is technically reachable, you must have the right to share its contents with us and our service providers. We do not guarantee the confidentiality of submitted URLs, the homepage content we fetch from them, or the verdict reports we generate from them. Submitted URLs and the content fetched from them are sent to our third-party AI provider for processing, may be persisted in our database, and may be displayed publicly as described in the next section.",
      },
      {
        kind: "p",
        text: "We may rate-limit, throttle, queue, deny, or cache scans at our discretion to protect the Service, manage costs, and prevent abuse.",
      },
    ],
  },
  {
    heading: "6. Public Reports & Content Removal",
    blocks: [
      {
        kind: "p",
        text: "Public reports. By default, verdict reports are published to a public-facing directory at predictable URLs and may be indexed by search engines. Reports are generated automatically without human verification, editorial review, or fact-checking prior to publication. They are intended as opinion-based commentary, satire, and automated, AI-generated analysis based on limited public data — not as statements of fact or accusations about any company, product, team, or individual. They reflect what a probabilistic system inferred from a brief homepage snapshot at a moment in time and may be inaccurate, incomplete, outdated, or simply wrong. Where the tone is snarky, that snark is editorial commentary, not assertion.",
      },
      {
        kind: "p",
        text: "No monitoring obligation. We are not obligated to monitor, review, moderate, fact-check, or pre-screen reports or other content generated or submitted through the Service, and we do not assume responsibility for any such content unless and until it is brought to our attention through the process described below.",
      },
      {
        kind: "p",
        text: "Removal requests. If you believe a report contains content that is unlawful, defamatory, infringing, or otherwise warrants removal or correction, please contact us at support@saaspocalypse.dev with: (a) the URL of the report, (b) the specific content at issue, (c) your reason for the request, and (d) your relationship to the affected company or person.",
      },
      {
        kind: "p",
        text: "Copyright (DMCA). For copyright concerns affecting U.S. visitors, send notices that comply with 17 U.S.C. § 512(c)(3) — including identification of the copyrighted work, identification of the allegedly infringing material, your contact information, a good-faith statement, a statement under penalty of perjury that you are authorized to act, and your physical or electronic signature — to support@saaspocalypse.dev. We will respond to valid notices in accordance with the DMCA. Knowingly submitting a materially misrepresentative notice may expose you to liability under § 512(f).",
      },
      {
        kind: "p",
        text: "Our discretion. We may, at our sole discretion and without obligation, remove, modify, redact, de-index, or de-list any report or generated content for any reason or no reason. We may retain underlying records (without re-publication) for legal, fraud-prevention, audit, and operational purposes.",
      },
      {
        kind: "p",
        text: "Third-party caches. Removing or de-indexing content from the Service does not guarantee its removal from third-party search engines, web archives, AI-training datasets, mirrors, or other caches outside our control. If you need content removed from those services, you must contact them directly using their own processes.",
      },
    ],
  },
  {
    heading: "7. Paid Build Guides",
    blocks: [
      {
        kind: "p",
        text: "If you choose to purchase a build guide, the deliverable is a written, AI-generated guide associated with a specific scanned URL, accessible via a magic-link URL we send to the email address you provide at checkout. The guide is the product; access to it is provided for your personal, non-transferable use.",
      },
      {
        kind: "p",
        text: "Magic-link responsibility. You are responsible for maintaining the confidentiality of any magic-link URL we issue to you. Anyone who possesses a valid magic link can access the associated guide; we may treat any access via your magic link as authorized by you. Notify us promptly at support@saaspocalypse.dev if you believe your link has been disclosed without your consent so we can rotate it.",
      },
      {
        kind: "p",
        text: "No sharing or redistribution. You must not share, resell, sublicense, post publicly, or otherwise distribute the magic link or the guide content. We may rotate, invalidate, or expire magic links at our discretion if we detect sharing, abuse, or fraudulent activity. We currently do not enforce a fixed expiration window for magic links, but we reserve the right to introduce one in the future.",
      },
    ],
  },
  {
    heading: "8. Pricing & Payment",
    blocks: [
      {
        kind: "p",
        text: "Build guides are priced as displayed at checkout, in U.S. dollars, and are billed at the time of purchase. Payment is processed by Stripe, Inc. (\"Stripe\"), our third-party payment processor. By submitting payment information, you authorize Stripe to charge the payment method you provide. We do not store your full card number or CVV; we receive only a session identifier and the email address you submit.",
      },
      {
        kind: "p",
        text: "All prices, fees, and taxes (where applicable) are shown at checkout. We reserve the right to change pricing at any time. Price changes do not affect purchases that were already completed.",
      },
    ],
  },
  {
    heading: "9. Refund Policy",
    blocks: [
      {
        kind: "p",
        text: "Build guides are digital goods. Because the guide is generated, delivered, and accessible immediately upon successful payment, all sales are final and we do not offer refunds, returns, or exchanges once the guide has been generated and a magic link has been issued.",
      },
      {
        kind: "p",
        text: "No refunds for dissatisfaction. For the avoidance of doubt, dissatisfaction with the content, accuracy, depth, tone, length, structure, or perceived quality of an AI-generated build guide is not a basis for a refund. The guide is provided as-is, you have access to public verdict examples and a free verdict before purchase, and you agree that the inherent variability of large-language-model output — including the occasional unhelpful or off-target guide — is part of what you are buying.",
      },
      {
        kind: "p",
        text: "Technical failure exception. If a technical failure prevents the guide from ever being generated or delivered to you within a reasonable period after payment, contact us at support@saaspocalypse.dev within 14 days of the charge and we will work in good faith to either re-deliver the guide or refund the purchase. Statutory rights that cannot be waived under your local consumer-protection laws are not affected by this section.",
      },
    ],
  },
  {
    heading: "10. Acceptable Use",
    blocks: [
      {
        kind: "p",
        text: "You agree not to misuse the Service. Without limiting that obligation, you agree that you will not:",
      },
      {
        kind: "ul",
        items: [
          "submit URLs to the scanner that you do not have a lawful right to scan, that point to non-public resources, that bypass authentication, paywalls, or access controls, or that would otherwise cause us to access content in violation of the target website's terms of service, robots directives, or applicable law;",
          "use any automated means (scrapers, bots, headless browsers, scripts) to interact with the Service or its API except as we expressly permit;",
          "circumvent, disable, or interfere with rate limits, locks, security features, or other technical protection measures, including by rotating IP addresses or abusing multiple email addresses;",
          "resell, redistribute, repackage, or republish generated reports or build guides as your own, or as part of a competing product;",
          "use Service outputs to harass, defame, or threaten any individual, company, or product, or to coordinate targeted abuse;",
          "use the Service to develop, train, fine-tune, or benchmark a competing AI model, dataset, or evaluation suite without our prior written consent;",
          "upload, transmit, or generate unlawful, infringing, or otherwise objectionable content; or",
          "attempt to reverse-engineer, decompile, or extract the prompts, weights, or proprietary logic of the Service.",
        ],
      },
      {
        kind: "p",
        text: "Your responsibility for actions on outputs. You are solely responsible for any decision you make and any action you take based on a verdict report or a build guide. That includes ensuring that anything you build, ship, market, sell, or distribute does not infringe the intellectual-property rights of others, breach a third party's terms of service, violate trade-secret or confidentiality obligations, misappropriate brand or trade dress, or violate any applicable law. The Service does not perform an IP, freedom-to-operate, security, or compliance review, and reliance on its outputs does not transfer or shift responsibility for those determinations to us.",
      },
      {
        kind: "p",
        text: "We may suspend or terminate access for any account, IP address, email address, or domain we reasonably believe is engaged in any of the conduct prohibited by this section.",
      },
    ],
  },
  {
    heading: "11. Intellectual Property",
    blocks: [
      {
        kind: "p",
        text: "The Service, including its software, design, brand, copy, prompts, templates, and the look-and-feel of any output presentation, is owned by WEB3 SOLUTIONS LLC or our licensors and is protected by intellectual-property laws. Except for the rights expressly granted in these Terms, no rights are transferred to you.",
      },
      {
        kind: "p",
        text: "You retain all rights you have in the URLs and information you submit. By submitting a URL, you grant us a worldwide, non-exclusive, royalty-free license to fetch the publicly available content at that URL, process it through our pipeline (including third-party AI providers), generate and store a verdict report, and display, reproduce, and distribute that report and any associated build guide as part of the Service.",
      },
      {
        kind: "p",
        text: "Subject to your compliance with these Terms and your payment of any applicable fees, we grant you a personal, non-exclusive, non-transferable, revocable license to access and use the verdict report and any build guide you have purchased for your own internal evaluation, learning, and reference purposes. Because outputs are AI-generated, similar or identical outputs may be produced for other users; we make no claim of exclusivity in any individual output.",
      },
    ],
  },
  {
    heading: "12. Third-Party Services & Outbound Links",
    blocks: [
      {
        kind: "p",
        text: "The Service relies on third-party providers, including Anthropic (LLM inference), Stripe (payments), Resend (email delivery), Supabase (database hosting), Upstash (rate-limiting), and Vercel (hosting). Your use of those third-party services through the Service is also subject to their own terms and privacy policies, and we are not responsible for their acts or omissions.",
      },
      {
        kind: "p",
        text: "The Service may also contain links to third-party websites that we do not own or control. We do not endorse and are not responsible for the content, policies, or practices of any third-party site.",
      },
    ],
  },
  {
    heading: "13. Service Availability",
    blocks: [
      {
        kind: "p",
        text: "We provide the Service on a reasonable-efforts basis. We do not commit to any specific uptime, availability, response time, or processing time, and we do not provide a service-level agreement. Scans and guide generations may fail, queue, time out, be cached, or be denied based on rate limits, lock contention, third-party-provider availability, or other operational factors. We may modify, suspend, or discontinue all or part of the Service at any time, with or without notice, and without liability to you.",
      },
      {
        kind: "p",
        text: "Experimental product. The Service is an experimental, evolving product. Features, prompts, models, pricing, output formatting, and behavior may change without notice. Outputs may be inconsistent across runs. By using the Service, you acknowledge and accept that experimental nature.",
      },
    ],
  },
  {
    heading: "14. Disclaimers",
    blocks: [
      {
        kind: "p",
        text: "THE SERVICE IS PROVIDED \"AS IS\" AND \"AS AVAILABLE,\" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT, ACCURACY, OR UNINTERRUPTED OPERATION. WE DO NOT WARRANT THAT VERDICTS, SCORES, TIME ESTIMATES, STACK INFERENCES, OR BUILD GUIDES ARE ACCURATE, COMPLETE, OR FREE OF ERRORS.",
      },
      {
        kind: "p",
        text: "Verdict reports and build guides are opinion-based commentary and automated, AI-generated analysis. They are not statements of fact, and they should not be construed as endorsements, accusations, accreditations, professional evaluations, or representations about any company, product, team, or individual. The snark, satire, and editorial framing that accompany them are part of that commentary.",
      },
      {
        kind: "p",
        text: "A \"buildable\" verdict is an opinion produced by a probabilistic system. It is not a representation that you, specifically, can or should attempt to build the underlying product, or that doing so would be lawful, ethical, or commercially viable. You are solely responsible for evaluating any output before you act on it. Nothing on the Service constitutes legal, business, financial, tax, accounting, security, or intellectual-property advice.",
      },
    ],
  },
  {
    heading: "15. Limitation of Liability",
    blocks: [
      {
        kind: "p",
        text: "TO THE MAXIMUM EXTENT PERMITTED BY LAW, IN NO EVENT WILL WEB3 SOLUTIONS LLC, ITS AFFILIATES, OR ITS LICENSORS BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, REVENUE, GOODWILL, DATA, OR BUSINESS OPPORTUNITIES, ARISING OUT OF OR RELATED TO THE SERVICE, WHETHER BASED ON CONTRACT, TORT (INCLUDING NEGLIGENCE), STRICT LIABILITY, OR ANY OTHER LEGAL THEORY, EVEN IF WE HAVE BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.",
      },
      {
        kind: "p",
        text: "OUR TOTAL CUMULATIVE LIABILITY ARISING OUT OF OR RELATED TO THE SERVICE WILL NOT EXCEED THE GREATER OF (A) THE AMOUNT YOU PAID TO US FOR THE SERVICE IN THE 12 MONTHS PRECEDING THE EVENT GIVING RISE TO THE LIABILITY OR (B) FIFTY U.S. DOLLARS ($50). SOME JURISDICTIONS DO NOT ALLOW CERTAIN LIMITATIONS OR EXCLUSIONS, SO PORTIONS OF THIS SECTION MAY NOT APPLY TO YOU; IN THAT CASE OUR LIABILITY WILL BE LIMITED TO THE MAXIMUM EXTENT PERMITTED BY LAW.",
      },
    ],
  },
  {
    heading: "16. Indemnification",
    blocks: [
      {
        kind: "p",
        text: "You agree to defend, indemnify, and hold harmless WEB3 SOLUTIONS LLC and its officers, directors, employees, contractors, and agents from and against any claims, demands, losses, liabilities, damages, costs, and expenses (including reasonable attorneys' fees) arising out of or related to (a) your use of the Service, (b) URLs or other content you submit, (c) any product, service, or content you build, ship, or distribute based on Service outputs, (d) your violation of these Terms, or (e) your violation of any law or third-party right.",
      },
    ],
  },
  {
    heading: "17. Termination",
    blocks: [
      {
        kind: "p",
        text: "You may stop using the Service at any time. We may suspend or terminate your access at any time, with or without notice, for any reason, including a violation of these Terms or risk to the Service or its users.",
      },
      {
        kind: "p",
        text: "Sections that by their nature should survive termination — including, without limitation, intellectual-property, disclaimers, limitation of liability, indemnification, force majeure, assignment, and dispute-resolution provisions — will survive. Access to a previously delivered build guide will normally continue after termination unless the termination relates to your violation of these Terms.",
      },
    ],
  },
  {
    heading: "18. Force Majeure",
    blocks: [
      {
        kind: "p",
        text: "We will not be liable for any failure or delay in performance that is caused by an event beyond our reasonable control, including acts of God, natural disasters, fire, flood, severe weather, war, terrorism, civil unrest, government action or order, embargo, labor disturbance, internet or telecommunications failure, denial-of-service attack, or any outage, disruption, rate-limiting, or change in service of any third-party provider on which the Service depends (including, without limitation, our LLM, payment, email, database, rate-limiting, and hosting providers).",
      },
    ],
  },
  {
    heading: "19. Assignment",
    blocks: [
      {
        kind: "p",
        text: "You may not assign or transfer these Terms or any rights or obligations under them, by operation of law or otherwise, without our prior written consent, and any attempt to do so will be null and void. We may assign these Terms, in whole or in part, without restriction and without notice to you, including in connection with a merger, acquisition, financing, reorganization, bankruptcy, change of control, or sale of all or substantially all of our assets.",
      },
    ],
  },
  {
    heading: "20. Export Controls & Sanctions",
    blocks: [
      {
        kind: "p",
        text: "You agree to comply with all applicable export-control, re-export, and economic-sanctions laws and regulations, including those administered by the U.S. Department of Commerce, the U.S. Department of the Treasury's Office of Foreign Assets Control (OFAC), and any other relevant authority. You represent that you are not located in, ordinarily resident in, or a national of any country or region subject to comprehensive U.S. sanctions, and that you are not on any U.S. government list of restricted, denied, or sanctioned parties. You will not access, use, or export the Service in violation of any such law or regulation.",
      },
    ],
  },
  {
    heading: "21. Changes to These Terms",
    blocks: [
      {
        kind: "p",
        text: "We may revise these Terms from time to time. When we do, we will update the Effective Date at the top of this page. For material changes, we will use commercially reasonable efforts to notify you (for example, via a banner on the site or, where we have your email, by email). Continued use of the Service after the change becomes effective means you accept the revised Terms.",
      },
    ],
  },
  {
    heading: "22. Governing Law & Disputes",
    blocks: [
      {
        kind: "p",
        text: "These Terms are governed by the laws of the State of Indiana, United States, without regard to its conflict-of-laws principles. Before filing a formal dispute, you agree to first contact us at support@saaspocalypse.dev and to attempt to resolve the dispute informally for at least 30 days.",
      },
      {
        kind: "p",
        text: "If the dispute is not resolved informally, it will be brought exclusively in the state or federal courts located in Indiana, and you and we consent to the personal jurisdiction of those courts. To the extent permitted by law, you and we each waive any right to a jury trial and any right to participate in a class, collective, or representative action against the other.",
      },
    ],
  },
  {
    heading: "23. Contact",
    blocks: [
      {
        kind: "p",
        text: "Questions about these Terms, or content removal requests? Contact us at support@saaspocalypse.dev.",
      },
    ],
  },
];
