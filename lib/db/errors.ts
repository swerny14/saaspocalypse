/**
 * Supabase's PostgrestError is a plain object, not an Error instance — so
 * `throw error` loses stack traces and trips up generic `instanceof Error`
 * checks. Wrap it in a real Error with the useful fields inlined in the
 * message so the root cause surfaces to callers.
 */
export function wrapDbError(err: unknown, context: string): Error {
  if (err instanceof Error) return err;
  if (err && typeof err === "object") {
    const rec = err as Record<string, unknown>;
    const parts: string[] = [];
    if (typeof rec.message === "string" && rec.message) parts.push(rec.message);
    if (typeof rec.code === "string" && rec.code) parts.push(`[${rec.code}]`);
    if (typeof rec.details === "string" && rec.details) parts.push(rec.details);
    if (typeof rec.hint === "string" && rec.hint) parts.push(`(hint: ${rec.hint})`);
    if (parts.length) return new Error(`${context}: ${parts.join(" ")}`);
  }
  return new Error(`${context}: ${String(err)}`);
}
