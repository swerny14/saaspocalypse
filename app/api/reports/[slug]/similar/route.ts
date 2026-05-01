import { NextResponse } from "next/server";
import { getSimilarReports } from "@/lib/db/neighbors";
import { getReportBySlug } from "@/lib/db/reports";

export const runtime = "nodejs";

type Params = Promise<{ slug: string }>;

export async function GET(_req: Request, { params }: { params: Params }) {
  const { slug } = await params;
  const report = await getReportBySlug(slug);

  if (!report) {
    return NextResponse.json(
      { ok: false, reason: "not_found" },
      { status: 404 },
    );
  }

  const similar = await getSimilarReports(report.id, 6);
  return NextResponse.json({ ok: true, similar });
}
