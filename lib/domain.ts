import { parse } from "tldts";

export class InvalidDomainError extends Error {
  constructor(public readonly input: string, public readonly reason: string) {
    super(`Invalid domain "${input}": ${reason}`);
    this.name = "InvalidDomainError";
  }
}

/**
 * Normalize a user-submitted URL or bare hostname into a canonical eTLD+1 domain.
 *
 * - `https://www.notion.so/product?x=1` → `notion.so`
 * - `app.notion.so` → `notion.so`
 * - `notion.so` → `notion.so`
 *
 * Rejects localhost, IPs, single-label hosts, and other garbage so we don't
 * spend LLM tokens on obvious non-SaaS inputs.
 */
export function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) throw new InvalidDomainError(input, "empty input");

  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  let hostname: string;
  try {
    hostname = new URL(withScheme).hostname.toLowerCase();
  } catch {
    throw new InvalidDomainError(input, "not a parseable URL");
  }

  const parsed = parse(hostname);
  if (!parsed.domain || !parsed.publicSuffix) {
    throw new InvalidDomainError(input, "not a registrable domain");
  }
  if (parsed.isIp) {
    throw new InvalidDomainError(input, "IP addresses are not supported");
  }
  if (hostname === "localhost" || hostname.endsWith(".localhost")) {
    throw new InvalidDomainError(input, "localhost is not a SaaS");
  }

  return parsed.domain;
}

/** Safe version of normalizeUrl that returns null instead of throwing. */
export function tryNormalizeUrl(input: string): string | null {
  try {
    return normalizeUrl(input);
  } catch {
    return null;
  }
}

/** `notion.so` → `notion-so`. Lossless + reversible. */
export function toSlug(domain: string): string {
  return domain.replaceAll(".", "-");
}

/** `notion-so` → `notion.so`. */
export function fromSlug(slug: string): string {
  return slug.replaceAll("-", ".");
}
