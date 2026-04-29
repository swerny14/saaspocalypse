import { NextResponse, type NextRequest } from "next/server";
import { loginWithSecret } from "@/lib/admin/auth";

export const runtime = "nodejs";

/**
 * Accepts a multipart/x-www-form-urlencoded POST from /admin/login. Sets the
 * auth cookie via `loginWithSecret` and redirects on success. On failure,
 * round-trips back to the login page with an `error=` query param.
 */
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const secret = String(form.get("secret") ?? "");
  const next = String(form.get("next") ?? "/admin/unknowns");
  const safeNext = next.startsWith("/admin/") ? next : "/admin/unknowns";

  if (!process.env.ADMIN_SECRET) {
    return NextResponse.redirect(
      new URL("/admin/login?error=no_secret_configured", req.url),
      303,
    );
  }

  const ok = await loginWithSecret(secret);
  if (!ok) {
    return NextResponse.redirect(new URL("/admin/login?error=bad_secret", req.url), 303);
  }
  return NextResponse.redirect(new URL(safeNext, req.url), 303);
}
