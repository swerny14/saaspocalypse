import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdmin } from "@/lib/admin/auth";
import { getGap, markApplied } from "@/lib/db/similarity_gaps";
import {
  addPatternToCapability,
  insertCapability,
} from "@/lib/db/capabilities";
import { getReportsByIds } from "@/lib/db/reports";
import { loadEngineContextFromDb } from "@/lib/db/taxonomy_loader";
import { persistProjection } from "@/lib/db/projections";
import { logError } from "@/lib/error_log";
import { projectReport } from "@/lib/normalization/engine";
import type { CapabilityCategory } from "@/lib/normalization/taxonomy/types";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Apply a similarity-gap suggestion. The body specifies which kind of fix
 * the curator chose (mirroring the LLM's suggestion shape). After mutating
 * the taxonomy, the route refreshes BOTH reports' descriptor projections so
 * the curator can verify the pair now converges in `/r/<slug>`.
 *
 * Three actions:
 *   - add_pattern: append a pattern to an existing capability.
 *   - new_capability: insert a new descriptor capability.
 *   - dismiss: handled by /dismiss/route.ts; not here.
 */

const CATEGORIES = [
  "collab",
  "content",
  "commerce",
  "comm",
  "ai",
  "infra",
  "data",
  "workflow",
  "identity",
] as const;

const ApplyBodySchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("add_pattern"),
    capability_slug: z.string().min(1).max(80),
    pattern: z.string().min(1).max(120),
  }),
  z.object({
    kind: z.literal("new_capability"),
    slug: z
      .string()
      .regex(/^[a-z0-9][a-z0-9-]{0,63}$/, "slug must be lowercase kebab-case"),
    display_name: z.string().min(1).max(80),
    category: z.enum(CATEGORIES),
    match_patterns: z.array(z.string().min(1).max(120)).min(2).max(15),
    is_descriptor: z.boolean().default(true),
  }),
]);

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  let body: z.infer<typeof ApplyBodySchema>;
  try {
    body = ApplyBodySchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        reason: "invalid_body",
        message: err instanceof Error ? err.message : "invalid body",
      },
      { status: 400 },
    );
  }

  try {
    const gap = await getGap(id);
    if (!gap) {
      return NextResponse.json({ ok: false, reason: "not_found" }, { status: 404 });
    }

    if (body.kind === "add_pattern") {
      await addPatternToCapability(body.capability_slug, body.pattern);
    } else {
      await insertCapability({
        slug: body.slug,
        display_name: body.display_name,
        category: body.category as CapabilityCategory,
        match_patterns: body.match_patterns,
        is_descriptor: body.is_descriptor,
      });
    }

    const reports = await getReportsByIds([gap.report_a_id, gap.report_b_id]);
    const { context } = await loadEngineContextFromDb();
    for (const report of reports) {
      const projection = projectReport(report, report.detected_stack, context);
      await persistProjection(report.id, projection);
    }

    await markApplied(id);

    return NextResponse.json({ ok: true });
  } catch (e) {
    await logError({
      scope: "scan",
      reason: "similarity_gap_apply_failed",
      refId: id,
      message: e instanceof Error ? e.message : String(e),
    });
    return NextResponse.json(
      { ok: false, message: e instanceof Error ? e.message : "internal" },
      { status: 500 },
    );
  }
}
