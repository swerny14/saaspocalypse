import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin/auth";
import { deleteCapability } from "@/lib/db/capabilities";
import { logError } from "@/lib/error_log";

export const runtime = "nodejs";

const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });
  }
  const { slug } = await params;
  if (!SLUG_RE.test(slug)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  try {
    await deleteCapability(slug);
    return NextResponse.json({ ok: true });
  } catch (e) {
    await logError({
      scope: "scan",
      reason: "admin_delete_capability_failed",
      refSlug: slug,
      message: e instanceof Error ? e.message : String(e),
    });
    return NextResponse.json(
      { ok: false, message: e instanceof Error ? e.message : "internal" },
      { status: 500 },
    );
  }
}
