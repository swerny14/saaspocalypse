import type { StackComponent } from "./types";

/**
 * Canonical stack components. THIS FILE IS REGENERATED FROM SUPABASE.
 *
 * Source of truth flow:
 *   1. The TS file is the seed (initial set + manual edits by hand).
 *   2. /admin/unknowns writes new aliases + new components to the DB.
 *   3. `pnpm tsx scripts/dump_taxonomy.ts` rewrites this file from DB rows.
 *   4. `pnpm tsx scripts/sync_taxonomy.ts` pushes TS back to DB (idempotent).
 *
 * To add a component by hand: edit this file directly, run sync_taxonomy.
 * To add via the admin UI: triage at /admin/unknowns, then dump_taxonomy.
 *
 * `commoditization_level` rationale:
 *   - 5 = ubiquitous, trivial-to-swap (Vercel, GA, Cloudflare)
 *   - 4 = ubiquitous but more involved (Postgres, S3, Stripe)
 *   - 3 = commodity but with category-specific lock-in (Auth0, Algolia)
 *   - 2 = managed, niche
 *   - 1 = OSS self-hosted
 *   - 0 = bespoke / built-from-scratch
 */
export const STACK_COMPONENTS: StackComponent[] = [

  // ── hosting ──
  { slug: "aws", display_name: "AWS", category: "hosting", commoditization_level: 3, aliases: ["aws", "amazon web services"] },
  { slug: "azure", display_name: "Azure", category: "hosting", commoditization_level: 3, aliases: ["azure", "microsoft azure"] },
  { slug: "cloudflare-pages", display_name: "Cloudflare Pages", category: "hosting", commoditization_level: 5, aliases: ["cloudflare pages", "pages"] },
  { slug: "cloudflare-workers", display_name: "Cloudflare Workers", category: "hosting", commoditization_level: 4, aliases: ["cloudflare workers", "workers"] },
  { slug: "digitalocean", display_name: "DigitalOcean", category: "hosting", commoditization_level: 4, aliases: ["digitalocean", "digital ocean", "do"] },
  { slug: "fly-io", display_name: "Fly.io", category: "hosting", commoditization_level: 4, aliases: ["fly.io", "fly io", "flyio"] },
  { slug: "gcp", display_name: "Google Cloud", category: "hosting", commoditization_level: 3, aliases: ["gcp", "google cloud", "google cloud platform"] },
  { slug: "heroku", display_name: "Heroku", category: "hosting", commoditization_level: 4, aliases: ["heroku"] },
  { slug: "netlify", display_name: "Netlify", category: "hosting", commoditization_level: 5, aliases: ["netlify"] },
  { slug: "railway", display_name: "Railway", category: "hosting", commoditization_level: 4, aliases: ["railway", "railway.app"] },
  { slug: "render", display_name: "Render", category: "hosting", commoditization_level: 4, aliases: ["render", "render.com"] },
  { slug: "vercel", display_name: "Vercel", category: "hosting", commoditization_level: 5, aliases: ["vercel"] },
  // ── framework ──
  { slug: "astro", display_name: "Astro", category: "framework", commoditization_level: 5, aliases: ["astro"] },
  { slug: "django", display_name: "Django", category: "framework", commoditization_level: 4, aliases: ["django"] },
  { slug: "electron", display_name: "Electron", category: "framework", commoditization_level: 4, aliases: ["electron"] },
  { slug: "express", display_name: "Express", category: "framework", commoditization_level: 5, aliases: ["express", "express.js", "expressjs"] },
  { slug: "fastapi", display_name: "FastAPI", category: "framework", commoditization_level: 5, aliases: ["fastapi"] },
  { slug: "gatsby", display_name: "Gatsby", category: "framework", commoditization_level: 5, aliases: ["gatsby"] },
  { slug: "laravel", display_name: "Laravel", category: "framework", commoditization_level: 4, aliases: ["laravel"] },
  { slug: "nestjs", display_name: "NestJS", category: "framework", commoditization_level: 4, aliases: ["nestjs", "nest.js", "nest"] },
  { slug: "nextjs", display_name: "Next.js", category: "framework", commoditization_level: 5, aliases: ["next.js", "nextjs", "next"] },
  { slug: "nuxt", display_name: "Nuxt", category: "framework", commoditization_level: 5, aliases: ["nuxt", "nuxt.js"] },
  { slug: "phoenix", display_name: "Phoenix", category: "framework", commoditization_level: 4, aliases: ["phoenix", "phoenix framework", "elixir phoenix"] },
  { slug: "rails", display_name: "Rails", category: "framework", commoditization_level: 4, aliases: ["rails", "ruby on rails"] },
  { slug: "react", display_name: "React", category: "framework", commoditization_level: 4, aliases: ["react"] },
  { slug: "react-native", display_name: "React Native", category: "framework", commoditization_level: 4, aliases: ["react native"] },
  { slug: "react-router-7", display_name: "React Router 7", category: "framework", commoditization_level: 5, aliases: ["react router 7"] },
  { slug: "remix", display_name: "Remix", category: "framework", commoditization_level: 5, aliases: ["remix"] },
  { slug: "sveltekit", display_name: "SvelteKit", category: "framework", commoditization_level: 5, aliases: ["sveltekit", "svelte kit"] },
  { slug: "tauri", display_name: "Tauri", category: "framework", commoditization_level: 4, aliases: ["tauri"] },
  // ── ui ──
  { slug: "automerge", display_name: "Automerge", category: "ui", commoditization_level: 4, aliases: ["automerge"] },
  { slug: "blocknote", display_name: "BlockNote", category: "ui", commoditization_level: 4, aliases: ["blocknote", "block note"] },
  { slug: "cmdk", display_name: "cmdk", category: "ui", commoditization_level: 5, aliases: ["cmdk"] },
  { slug: "dnd-kit", display_name: "dnd-kit", category: "ui", commoditization_level: 5, aliases: ["dnd-kit", "dnd kit", "dndkit"] },
  { slug: "framer-motion", display_name: "Framer Motion", category: "ui", commoditization_level: 5, aliases: ["framer motion", "framer-motion"] },
  { slug: "headlessui", display_name: "Headless UI", category: "ui", commoditization_level: 5, aliases: ["headless ui", "headlessui", "@headlessui"] },
  { slug: "leaflet", display_name: "Leaflet", category: "ui", commoditization_level: 5, aliases: ["leaflet"] },
  { slug: "lexical", display_name: "Lexical", category: "ui", commoditization_level: 4, aliases: ["lexical"] },
  { slug: "mapbox-gl-js", display_name: "Mapbox GL JS", category: "ui", commoditization_level: 4, aliases: ["mapbox gl js"] },
  { slug: "prosemirror", display_name: "ProseMirror", category: "ui", commoditization_level: 4, aliases: ["prosemirror", "prose mirror"] },
  { slug: "radix-ui", display_name: "Radix UI", category: "ui", commoditization_level: 5, aliases: ["radix", "radix ui", "@radix-ui", "radix-ui"] },
  { slug: "shadcn-ui", display_name: "shadcn/ui", category: "ui", commoditization_level: 5, aliases: ["shadcn", "shadcn/ui", "shadcn ui", "shadcnui"] },
  { slug: "slate", display_name: "Slate", category: "ui", commoditization_level: 4, aliases: ["slate", "slate.js"] },
  { slug: "tanstack-query", display_name: "TanStack Query", category: "ui", commoditization_level: 5, aliases: ["tanstack query", "react query", "@tanstack/query"] },
  { slug: "tanstack-table", display_name: "TanStack Table", category: "ui", commoditization_level: 5, aliases: ["tanstack table", "react table", "@tanstack/table"] },
  { slug: "tiptap", display_name: "Tiptap", category: "ui", commoditization_level: 4, aliases: ["tiptap", "tip tap"] },
  { slug: "yjs", display_name: "Yjs", category: "ui", commoditization_level: 3, aliases: ["yjs"] },
  // ── cms ──
  { slug: "contentful", display_name: "Contentful", category: "cms", commoditization_level: 4, aliases: ["contentful"] },
  { slug: "framer", display_name: "Framer", category: "cms", commoditization_level: 5, aliases: ["framer"] },
  { slug: "ghost", display_name: "Ghost", category: "cms", commoditization_level: 5, aliases: ["ghost", "ghost cms"] },
  { slug: "sanity", display_name: "Sanity", category: "cms", commoditization_level: 4, aliases: ["sanity", "sanity.io"] },
  { slug: "shopify", display_name: "Shopify", category: "cms", commoditization_level: 5, aliases: ["shopify"] },
  { slug: "squarespace", display_name: "Squarespace", category: "cms", commoditization_level: 5, aliases: ["squarespace"] },
  { slug: "webflow", display_name: "Webflow", category: "cms", commoditization_level: 5, aliases: ["webflow"] },
  { slug: "wix", display_name: "Wix", category: "cms", commoditization_level: 5, aliases: ["wix"] },
  { slug: "wordpress", display_name: "WordPress", category: "cms", commoditization_level: 5, aliases: ["wordpress", "wp"] },
  // ── db ──
  { slug: "bigquery", display_name: "BigQuery", category: "db", commoditization_level: 3, aliases: ["bigquery"] },
  { slug: "clickhouse", display_name: "ClickHouse", category: "db", commoditization_level: 3, aliases: ["clickhouse"] },
  { slug: "dynamodb", display_name: "DynamoDB", category: "db", commoditization_level: 3, aliases: ["dynamodb", "dynamo"] },
  { slug: "electricsql", display_name: "ElectricSQL", category: "db", commoditization_level: 3, aliases: ["electricsql"] },
  { slug: "firebase", display_name: "Firebase", category: "db", commoditization_level: 4, aliases: ["firebase", "firestore"] },
  { slug: "mongodb", display_name: "MongoDB", category: "db", commoditization_level: 4, aliases: ["mongodb", "mongo"] },
  { slug: "mysql", display_name: "MySQL", category: "db", commoditization_level: 4, aliases: ["mysql"] },
  { slug: "neon", display_name: "Neon", category: "db", commoditization_level: 4, aliases: ["neon", "neon.tech"] },
  { slug: "planetscale", display_name: "PlanetScale", category: "db", commoditization_level: 4, aliases: ["planetscale", "planet scale"] },
  { slug: "postgres", display_name: "Postgres", category: "db", commoditization_level: 4, aliases: ["postgres", "postgresql", "pg"] },
  { slug: "redis", display_name: "Redis", category: "db", commoditization_level: 4, aliases: ["redis"] },
  { slug: "snowflake", display_name: "Snowflake", category: "db", commoditization_level: 3, aliases: ["snowflake"] },
  { slug: "supabase", display_name: "Supabase", category: "db", commoditization_level: 4, aliases: ["supabase"] },
  { slug: "turso", display_name: "Turso", category: "db", commoditization_level: 4, aliases: ["turso", "libsql"] },
  { slug: "upstash", display_name: "Upstash", category: "db", commoditization_level: 4, aliases: ["upstash"] },
  // ── payments ──
  { slug: "braintree", display_name: "Braintree", category: "payments", commoditization_level: 4, aliases: ["braintree"] },
  { slug: "lemon-squeezy", display_name: "Lemon Squeezy", category: "payments", commoditization_level: 4, aliases: ["lemon squeezy", "lemonsqueezy"] },
  { slug: "paddle", display_name: "Paddle", category: "payments", commoditization_level: 4, aliases: ["paddle"] },
  { slug: "polar", display_name: "Polar", category: "payments", commoditization_level: 4, aliases: ["polar", "polar.sh"] },
  { slug: "stripe", display_name: "Stripe", category: "payments", commoditization_level: 4, aliases: ["stripe"] },
  // ── auth ──
  { slug: "auth0", display_name: "Auth0", category: "auth", commoditization_level: 3, aliases: ["auth0"] },
  { slug: "clerk", display_name: "Clerk", category: "auth", commoditization_level: 4, aliases: ["clerk"] },
  { slug: "firebase-auth", display_name: "Firebase Auth", category: "auth", commoditization_level: 4, aliases: ["firebase auth"] },
  { slug: "lucia", display_name: "Lucia", category: "auth", commoditization_level: 5, aliases: ["lucia"] },
  { slug: "nextauth", display_name: "NextAuth", category: "auth", commoditization_level: 5, aliases: ["nextauth", "next-auth", "auth.js"] },
  { slug: "supabase-auth", display_name: "Supabase Auth", category: "auth", commoditization_level: 4, aliases: ["supabase auth"] },
  { slug: "workos", display_name: "WorkOS", category: "auth", commoditization_level: 3, aliases: ["workos"] },
  // ── cdn ──
  { slug: "bunny", display_name: "bunny.net", category: "cdn", commoditization_level: 4, aliases: ["bunny", "bunny.net", "bunnycdn"] },
  { slug: "cloudflare", display_name: "Cloudflare", category: "cdn", commoditization_level: 5, aliases: ["cloudflare"] },
  { slug: "cloudfront", display_name: "CloudFront", category: "cdn", commoditization_level: 4, aliases: ["cloudfront"] },
  { slug: "fastly", display_name: "Fastly", category: "cdn", commoditization_level: 4, aliases: ["fastly"] },
  // ── analytics ──
  { slug: "amplitude", display_name: "Amplitude", category: "analytics", commoditization_level: 4, aliases: ["amplitude"] },
  { slug: "fathom", display_name: "Fathom", category: "analytics", commoditization_level: 5, aliases: ["fathom", "usefathom"] },
  { slug: "ga4", display_name: "GA4", category: "analytics", commoditization_level: 5, aliases: ["ga4", "google analytics", "google analytics 4"] },
  { slug: "gtm", display_name: "GTM", category: "analytics", commoditization_level: 5, aliases: ["gtm", "google tag manager"] },
  { slug: "mixpanel", display_name: "Mixpanel", category: "analytics", commoditization_level: 4, aliases: ["mixpanel"] },
  { slug: "plausible", display_name: "Plausible", category: "analytics", commoditization_level: 5, aliases: ["plausible"] },
  { slug: "posthog", display_name: "PostHog", category: "analytics", commoditization_level: 4, aliases: ["posthog"] },
  { slug: "rrweb", display_name: "rrweb", category: "analytics", commoditization_level: 4, aliases: ["rrweb"] },
  { slug: "segment", display_name: "Segment", category: "analytics", commoditization_level: 4, aliases: ["segment"] },
  { slug: "vercel-analytics", display_name: "Vercel Analytics", category: "analytics", commoditization_level: 5, aliases: ["vercel analytics"] },
  // ── email ──
  { slug: "listmonk", display_name: "Listmonk", category: "email", commoditization_level: 4, aliases: ["listmonk"] },
  { slug: "loops", display_name: "Loops", category: "email", commoditization_level: 4, aliases: ["loops", "loops.so"] },
  { slug: "mailgun", display_name: "Mailgun", category: "email", commoditization_level: 4, aliases: ["mailgun"] },
  { slug: "postmark", display_name: "Postmark", category: "email", commoditization_level: 4, aliases: ["postmark"] },
  { slug: "react-email", display_name: "React Email", category: "email", commoditization_level: 5, aliases: ["react email"] },
  { slug: "resend", display_name: "Resend", category: "email", commoditization_level: 5, aliases: ["resend"] },
  { slug: "sendgrid", display_name: "SendGrid", category: "email", commoditization_level: 4, aliases: ["sendgrid"] },
  { slug: "ses", display_name: "AWS SES", category: "email", commoditization_level: 4, aliases: ["ses", "aws ses", "amazon ses"] },
  // ── support ──
  { slug: "crisp", display_name: "Crisp", category: "support", commoditization_level: 4, aliases: ["crisp"] },
  { slug: "helpscout", display_name: "Help Scout", category: "support", commoditization_level: 4, aliases: ["help scout", "helpscout"] },
  { slug: "intercom", display_name: "Intercom", category: "support", commoditization_level: 4, aliases: ["intercom"] },
  { slug: "plain", display_name: "Plain", category: "support", commoditization_level: 4, aliases: ["plain", "plain.com"] },
  { slug: "zendesk", display_name: "Zendesk", category: "support", commoditization_level: 4, aliases: ["zendesk"] },
  // ── crm ──
  { slug: "attio", display_name: "Attio", category: "crm", commoditization_level: 4, aliases: ["attio"] },
  { slug: "close", display_name: "Close", category: "crm", commoditization_level: 4, aliases: ["close", "close.io", "close.com"] },
  { slug: "folk", display_name: "Folk", category: "crm", commoditization_level: 4, aliases: ["folk", "folk crm"] },
  { slug: "hubspot", display_name: "HubSpot", category: "crm", commoditization_level: 3, aliases: ["hubspot", "hubspot crm", "hubspot oauth"] },
  { slug: "pipedrive", display_name: "Pipedrive", category: "crm", commoditization_level: 4, aliases: ["pipedrive"] },
  { slug: "salesforce", display_name: "Salesforce", category: "crm", commoditization_level: 3, aliases: ["salesforce", "sfdc"] },
  // ── ml ──
  { slug: "anthropic", display_name: "Anthropic", category: "ml", commoditization_level: 4, aliases: ["anthropic", "claude"] },
  { slug: "chroma", display_name: "Chroma", category: "ml", commoditization_level: 4, aliases: ["chroma", "chromadb"] },
  { slug: "deepgram", display_name: "Deepgram", category: "ml", commoditization_level: 3, aliases: ["deepgram"] },
  { slug: "elevenlabs", display_name: "ElevenLabs", category: "ml", commoditization_level: 3, aliases: ["elevenlabs", "eleven labs"] },
  { slug: "huggingface", display_name: "Hugging Face", category: "ml", commoditization_level: 4, aliases: ["hugging face", "huggingface"] },
  { slug: "langgraph", display_name: "LangGraph", category: "ml", commoditization_level: 4, aliases: ["langgraph"] },
  { slug: "modal", display_name: "Modal", category: "ml", commoditization_level: 3, aliases: ["modal", "modal.com"] },
  { slug: "openai", display_name: "OpenAI", category: "ml", commoditization_level: 4, aliases: ["openai", "gpt-4", "gpt-5", "chatgpt"] },
  { slug: "pinecone", display_name: "Pinecone", category: "ml", commoditization_level: 3, aliases: ["pinecone"] },
  { slug: "rembg", display_name: "rembg", category: "ml", commoditization_level: 5, aliases: ["rembg"] },
  { slug: "replicate", display_name: "Replicate", category: "ml", commoditization_level: 4, aliases: ["replicate", "replicate.com"] },
  { slug: "runpod", display_name: "RunPod", category: "ml", commoditization_level: 3, aliases: ["runpod"] },
  { slug: "weaviate", display_name: "Weaviate", category: "ml", commoditization_level: 3, aliases: ["weaviate"] },
  // ── search ──
  { slug: "algolia", display_name: "Algolia", category: "search", commoditization_level: 3, aliases: ["algolia"] },
  { slug: "elasticsearch", display_name: "Elasticsearch", category: "search", commoditization_level: 3, aliases: ["elasticsearch", "elastic"] },
  { slug: "meilisearch", display_name: "Meilisearch", category: "search", commoditization_level: 4, aliases: ["meilisearch"] },
  { slug: "typesense", display_name: "Typesense", category: "search", commoditization_level: 4, aliases: ["typesense"] },
  // ── queue ──
  { slug: "inngest", display_name: "Inngest", category: "queue", commoditization_level: 4, aliases: ["inngest"] },
  { slug: "kafka", display_name: "Kafka", category: "queue", commoditization_level: 3, aliases: ["kafka"] },
  { slug: "redpanda", display_name: "Redpanda", category: "queue", commoditization_level: 3, aliases: ["redpanda", "red panda"] },
  { slug: "temporal", display_name: "Temporal", category: "queue", commoditization_level: 3, aliases: ["temporal", "temporal.io"] },
  { slug: "trigger", display_name: "Trigger.dev", category: "queue", commoditization_level: 4, aliases: ["trigger.dev", "trigger"] },
  // ── monitoring ──
  { slug: "axiom", display_name: "Axiom", category: "monitoring", commoditization_level: 4, aliases: ["axiom", "axiom.co"] },
  { slug: "datadog", display_name: "Datadog", category: "monitoring", commoditization_level: 4, aliases: ["datadog"] },
  { slug: "logtail", display_name: "Logtail", category: "monitoring", commoditization_level: 4, aliases: ["logtail", "betterstack"] },
  { slug: "sentry", display_name: "Sentry", category: "monitoring", commoditization_level: 4, aliases: ["sentry"] },
  // ── devtools ──
  { slug: "cypress", display_name: "Cypress", category: "devtools", commoditization_level: 5, aliases: ["cypress", "cypress.io"] },
  { slug: "github", display_name: "GitHub", category: "devtools", commoditization_level: 5, aliases: ["github"] },
  { slug: "jest", display_name: "Jest", category: "devtools", commoditization_level: 5, aliases: ["jest"] },
  { slug: "linear", display_name: "Linear", category: "devtools", commoditization_level: 4, aliases: ["linear", "linear.app"] },
  { slug: "playwright", display_name: "Playwright", category: "devtools", commoditization_level: 5, aliases: ["playwright"] },
  { slug: "puppeteer", display_name: "Puppeteer", category: "devtools", commoditization_level: 5, aliases: ["puppeteer"] },
  { slug: "selenium", display_name: "Selenium", category: "devtools", commoditization_level: 5, aliases: ["selenium"] },
  { slug: "vitest", display_name: "Vitest", category: "devtools", commoditization_level: 5, aliases: ["vitest"] },
  // ── integrations ──
  { slug: "discord-api", display_name: "Discord API", category: "integrations", commoditization_level: 4, aliases: ["discord api"] },
  { slug: "foursquare-places", display_name: "Foursquare Places", category: "integrations", commoditization_level: 3, aliases: ["foursquare places"] },
  { slug: "github-api", display_name: "GitHub API", category: "integrations", commoditization_level: 4, aliases: ["github api"] },
  { slug: "gmail-api", display_name: "Gmail API", category: "integrations", commoditization_level: 4, aliases: ["gmail api"] },
  { slug: "google-calendar-api", display_name: "Google Calendar API", category: "integrations", commoditization_level: 4, aliases: ["google calendar api", "google calendar", "gcal api"] },
  { slug: "google-drive-api", display_name: "Google Drive API", category: "integrations", commoditization_level: 4, aliases: ["google drive api", "google drive", "gdrive api"] },
  { slug: "google-places-api", display_name: "Google Places API", category: "integrations", commoditization_level: 4, aliases: ["google places api"] },
  { slug: "linear-api", display_name: "Linear API", category: "integrations", commoditization_level: 4, aliases: ["linear api"] },
  { slug: "notion-api", display_name: "Notion API", category: "integrations", commoditization_level: 4, aliases: ["notion api"] },
  { slug: "nylas", display_name: "Nylas", category: "integrations", commoditization_level: 4, aliases: ["nylas", "nylas api", "nylas for multi-provider"] },
  { slug: "reddit-api", display_name: "Reddit API", category: "integrations", commoditization_level: 4, aliases: ["reddit api"] },
  { slug: "shopify-api", display_name: "Shopify API", category: "integrations", commoditization_level: 4, aliases: ["shopify api"] },
  { slug: "slack-api", display_name: "Slack API", category: "integrations", commoditization_level: 4, aliases: ["slack api"] },
  { slug: "spotify-api", display_name: "Spotify API", category: "integrations", commoditization_level: 4, aliases: ["spotify api"] },
  { slug: "stripe-connect", display_name: "Stripe Connect", category: "integrations", commoditization_level: 4, aliases: ["stripe connect"] },
  { slug: "x-api", display_name: "X API", category: "integrations", commoditization_level: 4, aliases: ["x api", "twitter api", "x api v2", "x-api-v2"] },
  { slug: "youtube-api", display_name: "YouTube API", category: "integrations", commoditization_level: 4, aliases: ["youtube api", "youtube data api"] },
  // ── infra ──
  { slug: "apify", display_name: "Apify", category: "infra", commoditization_level: 3, aliases: ["apify"] },
  { slug: "bright-data", display_name: "Bright Data", category: "infra", commoditization_level: 3, aliases: ["bright data"] },
  { slug: "caddy", display_name: "Caddy", category: "infra", commoditization_level: 4, aliases: ["caddy"] },
  { slug: "expo-notifications", display_name: "Expo Notifications", category: "infra", commoditization_level: 4, aliases: ["expo notifications"] },
  { slug: "liveblocks", display_name: "Liveblocks", category: "infra", commoditization_level: 3, aliases: ["liveblocks"] },
  { slug: "mux", display_name: "Mux", category: "infra", commoditization_level: 3, aliases: ["mux"] },
  { slug: "nango", display_name: "Nango", category: "infra", commoditization_level: 3, aliases: ["nango"] },
  { slug: "oxylabs", display_name: "Oxylabs", category: "infra", commoditization_level: 3, aliases: ["oxylabs"] },
  { slug: "r2", display_name: "Cloudflare R2", category: "infra", commoditization_level: 4, aliases: ["r2", "cloudflare r2"] },
  { slug: "s3", display_name: "S3", category: "infra", commoditization_level: 4, aliases: ["s3", "aws s3"] },
  { slug: "twilio", display_name: "Twilio", category: "infra", commoditization_level: 4, aliases: ["twilio"] },
  { slug: "uploadthing", display_name: "UploadThing", category: "infra", commoditization_level: 5, aliases: ["uploadthing"] },
];

/**
 * Map fingerprinter display names → canonical slugs. The fingerprinter writes
 * `Vercel`/`Stripe`/etc. into `detected_stack`; the engine reads those and
 * attaches the canonical slug. Any name added to STACK_COMPONENTS above with
 * a matching `display_name` is automatically wired up; this map only needs
 * entries when the fingerprinter and the canonical taxonomy disagree.
 */
export const FINGERPRINT_NAME_OVERRIDES: Record<string, string> = {
  // (none today — keep here for when fingerprinter labels diverge)
};
