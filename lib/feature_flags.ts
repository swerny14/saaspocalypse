export function isDontTierGuidesEnabled(): boolean {
  // NEXT_PUBLIC_ prefix is required so the value is inlined into the client
  // bundle — VerdictReport renders both server-side (on /r/[slug]) and
  // client-side (inside the "use client" Scanner after a fresh scan).
  return process.env.NEXT_PUBLIC_ENABLE_DONT_TIER_GUIDES === "true";
}
