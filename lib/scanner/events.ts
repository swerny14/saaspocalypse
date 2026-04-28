import type { StoredReport } from "@/lib/db/reports";

export type ScanStepId = "normalize" | "fetch" | "fingerprint" | "analyze" | "verdict";

export const STEP_LABELS: Record<ScanStepId, string> = {
  normalize: "Pinging URL...",
  fetch: "Sniffing <script> tags...",
  fingerprint: "Reading the receipts...",
  analyze: "Consulting the indie hacker oracle...",
  verdict: "Printing verdict...",
};

export const STEP_ORDER: ScanStepId[] = [
  "normalize",
  "fetch",
  "fingerprint",
  "analyze",
  "verdict",
];

export type ScanErrorReason =
  | "invalid_url"
  | "rate_limited"
  | "fetch_failed"
  | "empty_html"
  | "not_a_saas"
  | "paywalled_or_blocked"
  | "ambiguous"
  | "llm_failed"
  | "internal";

export type ScanEvent =
  | { type: "step"; step: ScanStepId; label: string }
  | { type: "done"; cached: boolean; slug: string; report: StoredReport }
  | { type: "error"; reason: ScanErrorReason; message: string };

/** Encode a ScanEvent as a single SSE message. */
export function sseFormat(event: ScanEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}
