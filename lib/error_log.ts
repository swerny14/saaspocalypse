import { getSupabaseAdmin } from "@/lib/db/supabase";

export type ErrorScope =
  | "scan"
  | "guide_gen"
  | "purchase"
  | "webhook"
  | "resend";

export type LogErrorArgs = {
  scope: ErrorScope;
  /** Enum value from the pipeline (e.g. `ScanErrorReason`, `GuideErrorReason`). */
  reason?: string;
  /** DB PK-ish reference — report_id, purchase_id, etc. */
  refId?: string | null;
  /** Human-readable reference — domain slug, email, etc. */
  refSlug?: string | null;
  /** The real internal message. Stack traces, DB errors, Zod issues. */
  message: string;
  /** Any structured context: request metadata, payload previews, etc. */
  detail?: Record<string, unknown>;
};

/**
 * Persist an error for ops tracking. Never throws — logging failures are
 * themselves logged to stderr but never bubble to callers.
 *
 * Call this in every catch branch along paid paths (scan, guide generation,
 * purchase, webhook). User-facing messages remain generic (see
 * `scanner/user_messages.ts` and `build_guide/pipeline.ts`); the detailed
 * story lives here.
 */
export async function logError(args: LogErrorArgs): Promise<void> {
  // Always log to console too — makes dev debugging painless and guarantees
  // some visibility even if the DB insert fails.
  const prefix = `[${args.scope}${args.reason ? `:${args.reason}` : ""}]`;
  const suffix = args.refSlug ? ` · ref=${args.refSlug}` : "";
  console.error(`${prefix}${suffix} ${args.message}`, args.detail ?? "");

  try {
    const admin = getSupabaseAdmin();
    await admin.from("error_log").insert({
      scope: args.scope,
      reason: args.reason ?? null,
      ref_id: args.refId ?? null,
      ref_slug: args.refSlug ?? null,
      message: args.message,
      detail: args.detail ?? null,
    });
  } catch (e) {
    console.error("[error_log] persist failed:", e);
  }
}
