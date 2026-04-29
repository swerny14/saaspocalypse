import { cookies } from "next/headers";
import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Lightweight admin auth — a single shared `ADMIN_SECRET` env var, validated
 * via an HttpOnly cookie. No multi-user accounts; this gates a couple of
 * curation surfaces (taxonomy unknowns, future admin tools) that the project
 * owner uses solo. If you ever need per-user auditing, swap this for a real
 * provider — every consumer reads through `isAuthorized()` so the swap is
 * isolated.
 */

const COOKIE_NAME = "sap_admin";
const COOKIE_MAX_AGE_S = 60 * 60 * 24 * 30; // 30 days

/** SHA-256 of the secret. We never store the raw secret in the cookie. */
function hashSecret(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}

/**
 * Compare two hex-encoded hashes in constant time. Both inputs are SHA-256
 * outputs of identical length, so `timingSafeEqual` is safe to call directly.
 */
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a, "utf8"), Buffer.from(b, "utf8"));
}

export type AdminAuthStatus =
  | { ok: true }
  | { ok: false; reason: "no_secret_configured" | "no_cookie" | "bad_cookie" };

/**
 * Server-only authorization check. Reads the cookie from the current request.
 * Use in server components and route handlers. Returns a status enum so
 * callers can render the right thing (login form vs 401 vs etc).
 */
export async function checkAdminAuth(): Promise<AdminAuthStatus> {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return { ok: false, reason: "no_secret_configured" };
  const expected = hashSecret(secret);
  const jar = await cookies();
  const cookie = jar.get(COOKIE_NAME)?.value;
  if (!cookie) return { ok: false, reason: "no_cookie" };
  if (!constantTimeEqual(cookie, expected)) return { ok: false, reason: "bad_cookie" };
  return { ok: true };
}

/** True iff the current request is authenticated as admin. */
export async function isAdmin(): Promise<boolean> {
  return (await checkAdminAuth()).ok;
}

/**
 * Validate a submitted secret and set the auth cookie. Returns true on
 * success. The cookie holds the hashed secret, not the secret itself —
 * minor defense-in-depth in case the cookie ever leaks (still rotate the
 * env var if it does).
 */
export async function loginWithSecret(submitted: string): Promise<boolean> {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return false;
  const expected = hashSecret(secret);
  const got = hashSecret(submitted);
  if (!constantTimeEqual(expected, got)) return false;
  const jar = await cookies();
  jar.set(COOKIE_NAME, expected, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_MAX_AGE_S,
  });
  return true;
}

export async function clearAdminCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}
