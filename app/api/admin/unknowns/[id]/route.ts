import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { isAdmin } from "@/lib/admin/auth";
import {
  aliasUnknown,
  ignoreUnknown,
  promoteUnknown,
} from "@/lib/db/normalization_unknowns";
import { logError } from "@/lib/error_log";

export const runtime = "nodejs";

const CATEGORY = z.enum([
  "hosting",
  "framework",
  "ui",
  "cms",
  "db",
  "payments",
  "auth",
  "cdn",
  "analytics",
  "email",
  "support",
  "crm",
  "ml",
  "search",
  "queue",
  "monitoring",
  "devtools",
  "integrations",
  "infra",
]);

const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;

const Body = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("alias"),
    target_slug: z.string().regex(SLUG_RE),
  }),
  z.object({
    action: z.literal("promote"),
    slug: z.string().regex(SLUG_RE),
    display_name: z.string().min(1).max(80),
    category: CATEGORY,
    commoditization_level: z.number().int().min(0).max(5),
    extra_aliases: z.array(z.string().min(1).max(80)).default([]),
  }),
  z.object({ action: z.literal("ignore") }),
]);

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
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
    const body = parsed.data;
    if (body.action === "alias") {
      await aliasUnknown(id, body.target_slug);
    } else if (body.action === "promote") {
      const commoditizationLevel = body.commoditization_level as 0 | 1 | 2 | 3 | 4 | 5;
      await promoteUnknown(id, {
        slug: body.slug,
        display_name: body.display_name,
        category: body.category,
        commoditization_level: commoditizationLevel,
        extra_aliases: body.extra_aliases,
      });
    } else {
      await ignoreUnknown(id);
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    await logError({
      scope: "scan",
      reason: "admin_unknowns_resolve_failed",
      refId: id,
      message: e instanceof Error ? e.message : String(e),
      detail: { action: parsed.data.action },
    });
    return NextResponse.json(
      { ok: false, message: e instanceof Error ? e.message : "internal" },
      { status: 500 },
    );
  }
}
