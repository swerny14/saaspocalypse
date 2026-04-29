import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { isAdmin } from "@/lib/admin/auth";
import { addPatternToCapability } from "@/lib/db/capabilities";
import { logError } from "@/lib/error_log";

export const runtime = "nodejs";

const Body = z.object({
  pattern: z.string().min(1).max(120),
});

const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;

/**
 * Append a match pattern to an existing capability. Used by the
 * moat-anomalies admin page when a real-world report uses phrasing the
 * current patterns don't catch — fastest fix for a coverage gap.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });
  }
  const { slug } = await params;
  if (!SLUG_RE.test(slug)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const parsed = Body.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  try {
    const result = await addPatternToCapability(slug, parsed.data.pattern);
    return NextResponse.json({ ok: true, added: result.added });
  } catch (e) {
    await logError({
      scope: "scan",
      reason: "admin_add_pattern_failed",
      refSlug: slug,
      message: e instanceof Error ? e.message : String(e),
      detail: { pattern: parsed.data.pattern },
    });
    return NextResponse.json(
      { ok: false, message: e instanceof Error ? e.message : "internal" },
      { status: 500 },
    );
  }
}
