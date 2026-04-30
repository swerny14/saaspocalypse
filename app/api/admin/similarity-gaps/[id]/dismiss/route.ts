import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin/auth";
import { getGap, markDismissed } from "@/lib/db/similarity_gaps";
import { logError } from "@/lib/error_log";

export const runtime = "nodejs";

export async function POST(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  try {
    const gap = await getGap(id);
    if (!gap) {
      return NextResponse.json({ ok: false, reason: "not_found" }, { status: 404 });
    }
    await markDismissed(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    await logError({
      scope: "scan",
      reason: "similarity_gap_dismiss_failed",
      refId: id,
      message: e instanceof Error ? e.message : String(e),
    });
    return NextResponse.json(
      { ok: false, message: e instanceof Error ? e.message : "internal" },
      { status: 500 },
    );
  }
}
