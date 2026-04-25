import type { ScanErrorReason } from "./events";

/**
 * Generic, user-facing copy per scan failure mode. Internal detail (stack
 * traces, Zod issues, DB errors) should never reach the UI — log those to
 * console + `error_log` table instead.
 */
export const USER_SCAN_MESSAGES: Record<ScanErrorReason, string> = {
  invalid_url: "That URL doesn't look right. Try a real SaaS homepage.",
  rate_limited:
    "Too many scans from your network. Give it an hour and try again.",
  fetch_failed:
    "We couldn't reach that site. Check the URL, or try one that isn't behind a bot blocker.",
  empty_html:
    "That page didn't give us readable content — some sites render entirely client-side.",
  not_a_saas:
    "That doesn't look like a SaaS product. Try a software service with a pricing page.",
  paywalled_or_blocked:
    "That site is behind a paywall or actively blocks us. Pick a different one.",
  ambiguous:
    "We couldn't figure out what that product does from its homepage.",
  llm_failed: "Our robot got confused. Give it another shot.",
  internal: "Something broke on our end. Try again in a moment.",
};
