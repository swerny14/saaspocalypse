import type { BuildGuide } from "@/lib/build_guide/schema";
import { getSupabaseAdmin } from "./supabase";
import { wrapDbError } from "./errors";

export type StoredBuildGuide = BuildGuide & {
  id: string;
  report_id: string;
  model: string;
  input_tokens: number | null;
  output_tokens: number | null;
  generated_at: string;
};

export async function getBuildGuideByReportId(
  reportId: string,
): Promise<StoredBuildGuide | null> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("build_guides")
    .select("*")
    .eq("report_id", reportId)
    .maybeSingle();
  if (error) {
    console.error("[build_guides] getBuildGuideByReportId failed", error);
    return null;
  }
  return (data as StoredBuildGuide | null) ?? null;
}

export async function insertBuildGuide(
  reportId: string,
  guide: BuildGuide,
  meta: { model: string; input_tokens: number | null; output_tokens: number | null },
): Promise<StoredBuildGuide> {
  const admin = getSupabaseAdmin();
  const row = {
    report_id: reportId,
    ...guide,
    model: meta.model,
    input_tokens: meta.input_tokens,
    output_tokens: meta.output_tokens,
  };
  const { data, error } = await admin
    .from("build_guides")
    .insert(row)
    .select("*")
    .single();
  if (error) throw wrapDbError(error, "build_guides insert");
  return data as StoredBuildGuide;
}
