export type CuratedScanSite = {
  domain: string;
  brandQuery: string;
  category: string;
  expectedTier: "FORTRESS" | "CONTESTED" | "SOFT";
  note: string;
};

/**
 * First curated corpus for high-value wedge reports.
 *
 * Selection goals:
 * - High-awareness / high-search SaaS brands.
 * - Broad category coverage so similarity + segment pages get useful variety.
 * - Intentional moat spread: fortress incumbents, contested leaders, and
 *   softer indie-friendly products where the wedge should be more obvious.
 *
 * expectedTier is only a planning label. The scanner still derives tier from
 * the live moat scoring pass.
 */
export const CURATED_SCAN_SITES: CuratedScanSite[] = [
  // Fortress / thick-wall incumbents.
  { domain: "salesforce.com", brandQuery: "Salesforce", category: "CRM", expectedTier: "FORTRESS", note: "Enterprise CRM ecosystem and switching cost." },
  { domain: "servicenow.com", brandQuery: "ServiceNow", category: "IT service management", expectedTier: "FORTRESS", note: "Enterprise workflow depth and procurement lock-in." },
  { domain: "workday.com", brandQuery: "Workday", category: "HRIS", expectedTier: "FORTRESS", note: "Payroll/HR data gravity and enterprise approvals." },
  { domain: "adp.com", brandQuery: "ADP RUN", category: "Payroll", expectedTier: "FORTRESS", note: "Payroll compliance and long-running brand trust." },
  { domain: "stripe.com", brandQuery: "Stripe", category: "Payments", expectedTier: "FORTRESS", note: "Regulatory, fraud, capital, and network depth." },
  { domain: "shopify.com", brandQuery: "Shopify", category: "Commerce platform", expectedTier: "FORTRESS", note: "App ecosystem, payments, and merchant lock-in." },
  { domain: "cloudflare.com", brandQuery: "Cloudflare", category: "Security and CDN", expectedTier: "FORTRESS", note: "Global infrastructure and security trust." },
  { domain: "datadoghq.com", brandQuery: "Datadog", category: "Observability", expectedTier: "FORTRESS", note: "Telemetry depth, integrations, and enterprise switching cost." },
  { domain: "snowflake.com", brandQuery: "Snowflake", category: "Data warehouse", expectedTier: "FORTRESS", note: "Infrastructure, enterprise data gravity, and ecosystem." },
  { domain: "okta.com", brandQuery: "Okta", category: "Identity management", expectedTier: "FORTRESS", note: "Security trust and deep identity integrations." },
  { domain: "atlassian.com", brandQuery: "Jira Atlassian", category: "Project management", expectedTier: "FORTRESS", note: "Workflow lock-in and broad product suite." },
  { domain: "adobe.com", brandQuery: "Adobe Acrobat", category: "Document workflow", expectedTier: "FORTRESS", note: "Brand, file workflow, and enterprise procurement." },

  // Contested leaders with real walls but clearer wedge surfaces.
  { domain: "hubspot.com", brandQuery: "HubSpot", category: "Marketing CRM", expectedTier: "CONTESTED", note: "Strong brand and suite, but many niche wedges." },
  { domain: "zendesk.com", brandQuery: "Zendesk", category: "Customer support", expectedTier: "CONTESTED", note: "Ticketing maturity with vertical support wedges." },
  { domain: "intercom.com", brandQuery: "Intercom", category: "Customer messaging", expectedTier: "CONTESTED", note: "Brand and AI support, but expensive and segmentable." },
  { domain: "slack.com", brandQuery: "Slack", category: "Team chat", expectedTier: "CONTESTED", note: "Network and workflow pull, but narrow alternatives exist." },
  { domain: "notion.so", brandQuery: "Notion", category: "Workspace docs", expectedTier: "CONTESTED", note: "Brand and habit lock-in with exportable primitives." },
  { domain: "airtable.com", brandQuery: "Airtable", category: "No-code database", expectedTier: "CONTESTED", note: "Flexible product with vertical database wedges." },
  { domain: "asana.com", brandQuery: "Asana", category: "Work management", expectedTier: "CONTESTED", note: "Crowded project-management category." },
  { domain: "monday.com", brandQuery: "monday.com", category: "Work management", expectedTier: "CONTESTED", note: "Strong distribution with template/category wedges." },
  { domain: "clickup.com", brandQuery: "ClickUp", category: "Work management", expectedTier: "CONTESTED", note: "Broad feature surface and heavy search demand." },
  { domain: "figma.com", brandQuery: "Figma", category: "Design collaboration", expectedTier: "CONTESTED", note: "Realtime/collab moat, but plugin/workflow wedges." },
  { domain: "canva.com", brandQuery: "Canva", category: "Design platform", expectedTier: "CONTESTED", note: "Distribution giant with niche content wedges." },
  { domain: "github.com", brandQuery: "GitHub", category: "Developer platform", expectedTier: "CONTESTED", note: "Network/ecosystem moat, but tool-specific wedges." },
  { domain: "vercel.com", brandQuery: "Vercel", category: "Frontend hosting", expectedTier: "CONTESTED", note: "Developer distribution and infra trust." },
  { domain: "webflow.com", brandQuery: "Webflow", category: "Website builder", expectedTier: "CONTESTED", note: "Visual builder complexity and agency distribution." },
  { domain: "wix.com", brandQuery: "Wix", category: "Website builder", expectedTier: "CONTESTED", note: "Brand distribution with many niche builder openings." },
  { domain: "squarespace.com", brandQuery: "Squarespace", category: "Website builder", expectedTier: "CONTESTED", note: "Brand and templates, but category is substitutable." },
  { domain: "zapier.com", brandQuery: "Zapier", category: "Automation", expectedTier: "CONTESTED", note: "Integration breadth and brand, but workflow wedges." },
  { domain: "mailchimp.com", brandQuery: "Mailchimp", category: "Email marketing", expectedTier: "CONTESTED", note: "Brand and deliverability with niche list-builder wedges." },
  { domain: "dropbox.com", brandQuery: "Dropbox", category: "Cloud storage", expectedTier: "CONTESTED", note: "Brand and sync trust in a commodity category." },
  { domain: "box.com", brandQuery: "Box", category: "Enterprise storage", expectedTier: "CONTESTED", note: "Enterprise compliance and workflow depth." },
  { domain: "miro.com", brandQuery: "Miro", category: "Collaborative whiteboard", expectedTier: "CONTESTED", note: "Realtime canvas and team habit loop." },
  { domain: "zoom.us", brandQuery: "Zoom", category: "Video conferencing", expectedTier: "CONTESTED", note: "Brand and reliability, but many vertical wedges." },
  { domain: "loom.com", brandQuery: "Loom", category: "Screen recording", expectedTier: "CONTESTED", note: "Simple core with distribution and collaboration polish." },
  { domain: "grammarly.com", brandQuery: "Grammarly", category: "AI writing assistant", expectedTier: "CONTESTED", note: "Brand/data moat against many niche writing wedges." },
  { domain: "rippling.com", brandQuery: "Rippling", category: "HR and IT", expectedTier: "CONTESTED", note: "Operational suite with serious switching costs." },
  { domain: "gusto.com", brandQuery: "Gusto", category: "Payroll and HR", expectedTier: "CONTESTED", note: "Payroll trust but SMB-focused wedge space." },

  // Softer / more attackable surfaces.
  { domain: "calendly.com", brandQuery: "Calendly", category: "Scheduling", expectedTier: "SOFT", note: "Highly searched, simple core, good wedge-score calibration." },
  { domain: "typeform.com", brandQuery: "Typeform", category: "Form builder", expectedTier: "SOFT", note: "Polished UX over a cloneable primitive." },
  { domain: "tally.so", brandQuery: "Tally forms", category: "Form builder", expectedTier: "SOFT", note: "Indie-friendly form builder with thin technical walls." },
  { domain: "carrd.co", brandQuery: "Carrd", category: "Landing page builder", expectedTier: "SOFT", note: "Simple builder primitives and low switching cost." },
  { domain: "beehiiv.com", brandQuery: "beehiiv", category: "Newsletter platform", expectedTier: "SOFT", note: "Creator distribution with cloneable primitives." },
  { domain: "kit.com", brandQuery: "Kit email marketing", category: "Creator email", expectedTier: "SOFT", note: "Creator email workflows with niche wedge angles." },
  { domain: "buffer.com", brandQuery: "Buffer social media", category: "Social scheduling", expectedTier: "SOFT", note: "Scheduler core is straightforward and crowded." },
  { domain: "hootsuite.com", brandQuery: "Hootsuite", category: "Social media management", expectedTier: "SOFT", note: "High-awareness category with many focused alternatives." },
  { domain: "plausible.io", brandQuery: "Plausible Analytics", category: "Web analytics", expectedTier: "SOFT", note: "Simple privacy analytics and open-source pressure." },
  { domain: "fathom.com", brandQuery: "Fathom Analytics", category: "Web analytics", expectedTier: "SOFT", note: "Privacy analytics with simple product shape." },
  { domain: "crisp.chat", brandQuery: "Crisp chat", category: "Live chat", expectedTier: "SOFT", note: "Support chat is wedgeable by vertical and price." },
  { domain: "helpscout.com", brandQuery: "Help Scout", category: "Help desk", expectedTier: "SOFT", note: "Support workflows with SMB wedge potential." },
];

export function assertCuratedScanSiteCount(expected = 50): void {
  if (CURATED_SCAN_SITES.length !== expected) {
    throw new Error(
      `Expected ${expected} curated scan sites, found ${CURATED_SCAN_SITES.length}`,
    );
  }
}
