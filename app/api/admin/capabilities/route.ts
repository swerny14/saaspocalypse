import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { isAdmin } from "@/lib/admin/auth";
import { insertCapability } from "@/lib/db/capabilities";
import { logError } from "@/lib/error_log";

export const runtime = "nodejs";

const CATEGORY = z.enum([
  "collab",
  "content",
  "commerce",
  "comm",
  "ai",
  "infra",
  "data",
  "workflow",
  "identity",
]);

const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;

const Body = z.object({
  slug: z.string().regex(SLUG_RE),
  display_name: z.string().min(1).max(80),
  category: CATEGORY,
  match_patterns: z.array(z.string().min(1).max(120)).min(1).max(20),
  is_descriptor: z.boolean().default(true),
});

/**
 * Insert a brand-new canonical capability from descriptor/unknowns curation.
 */
export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const parsed = Body.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        issues: parsed.error.issues.map(
          (i) => `${i.path.join(".") || "(root)"}: ${i.message}`,
        ),
      },
      { status: 400 },
    );
  }

  try {
    await insertCapability(parsed.data);
    return NextResponse.json({ ok: true });
  } catch (e) {
    await logError({
      scope: "scan",
      reason: "admin_insert_capability_failed",
      refSlug: parsed.data.slug,
      message: e instanceof Error ? e.message : String(e),
    });
    return NextResponse.json(
      { ok: false, message: e instanceof Error ? e.message : "internal" },
      { status: 500 },
    );
  }
}
