import { getSupabaseAdmin } from "./supabase";
import { wrapDbError } from "./errors";

export type SocialPostStatus = "pending" | "posted" | "failed" | "dry_run";
export type ContentType = "report" | "original";

export type SocialPost = {
  id: string;
  platform: "x";
  content_type: ContentType;
  template_id: string;
  ref_id: string | null;
  ref_slug: string | null;
  body: string;
  thread_bodies: string[] | null;
  link_url: string | null;
  status: SocialPostStatus;
  tweet_id: string | null;
  tweet_url: string | null;
  thread_tweet_ids: string[] | null;
  error_reason: string | null;
  error_detail: Record<string, unknown> | null;
  scheduled_for: string;
  created_at: string;
  posted_at: string | null;
};

const COLUMNS = "*";

/** Postgres unique-violation error code. Surface as a typed sentinel so the
 *  caller can convert a race into a clean `skipped` outcome. */
export class SocialSlotTakenError extends Error {
  constructor(
    public readonly content_type: ContentType,
    public readonly platform: string,
  ) {
    super(`social slot already claimed: ${platform}/${content_type}`);
    this.name = "SocialSlotTakenError";
  }
}

function isUniqueViolation(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const code = (err as { code?: unknown }).code;
  return code === "23505";
}

export async function getTodaySlot(
  content_type: ContentType,
  platform: "x" = "x",
): Promise<SocialPost | null> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("social_posts")
    .select(COLUMNS)
    .eq("platform", platform)
    .eq("content_type", content_type)
    .eq("scheduled_for", todayDate())
    .in("status", ["posted", "pending"])
    .maybeSingle();
  if (error) throw wrapDbError(error, "social_posts getTodaySlot");
  return (data as SocialPost) ?? null;
}

export async function getRecentlyPostedSlugs(days = 30): Promise<string[]> {
  const admin = getSupabaseAdmin();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await admin
    .from("social_posts")
    .select("ref_slug")
    .eq("status", "posted")
    .gte("posted_at", since)
    .not("ref_slug", "is", null);
  if (error) throw wrapDbError(error, "social_posts getRecentlyPostedSlugs");
  const rows = (data as { ref_slug: string | null }[]) ?? [];
  const slugs = new Set<string>();
  for (const r of rows) if (r.ref_slug) slugs.add(r.ref_slug);
  return [...slugs];
}

export async function getRecentOriginalBodies(limit = 10): Promise<string[]> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("social_posts")
    .select("body")
    .eq("content_type", "original")
    .eq("status", "posted")
    .order("posted_at", { ascending: false })
    .limit(limit);
  if (error) throw wrapDbError(error, "social_posts getRecentOriginalBodies");
  const rows = (data as { body: string }[]) ?? [];
  return rows.map((r) => r.body);
}

export type InsertPostInput = {
  content_type: ContentType;
  template_id: string;
  ref_id?: string | null;
  ref_slug?: string | null;
  body: string;
  thread_bodies?: string[] | null;
  link_url?: string | null;
};

/** Claims today's slot atomically via the partial unique index. Throws
 *  `SocialSlotTakenError` on unique-violation so the orchestrator can
 *  convert a race into a `skipped` outcome. */
export async function insertPendingPost(
  input: InsertPostInput,
): Promise<SocialPost> {
  const admin = getSupabaseAdmin();
  const row = {
    content_type: input.content_type,
    template_id: input.template_id,
    ref_id: input.ref_id ?? null,
    ref_slug: input.ref_slug ?? null,
    body: input.body,
    thread_bodies: input.thread_bodies ?? null,
    link_url: input.link_url ?? null,
    status: "pending" as const,
  };
  const { data, error } = await admin
    .from("social_posts")
    .insert(row)
    .select(COLUMNS)
    .single();
  if (error) {
    if (isUniqueViolation(error)) {
      throw new SocialSlotTakenError(input.content_type, "x");
    }
    throw wrapDbError(error, "social_posts insertPendingPost");
  }
  return data as SocialPost;
}

export async function insertDryRunPost(
  input: InsertPostInput,
): Promise<SocialPost> {
  const admin = getSupabaseAdmin();
  const row = {
    content_type: input.content_type,
    template_id: input.template_id,
    ref_id: input.ref_id ?? null,
    ref_slug: input.ref_slug ?? null,
    body: input.body,
    thread_bodies: input.thread_bodies ?? null,
    link_url: input.link_url ?? null,
    status: "dry_run" as const,
  };
  const { data, error } = await admin
    .from("social_posts")
    .insert(row)
    .select(COLUMNS)
    .single();
  if (error) throw wrapDbError(error, "social_posts insertDryRunPost");
  return data as SocialPost;
}

export async function updatePostBody(
  id: string,
  body: string,
  thread_bodies: string[] | null,
  link_url: string | null,
): Promise<void> {
  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from("social_posts")
    .update({ body, thread_bodies, link_url })
    .eq("id", id);
  if (error) throw wrapDbError(error, "social_posts updatePostBody");
}

export async function markPosted(
  id: string,
  head: { tweet_id: string; tweet_url: string },
  reply_tweet_ids: string[] = [],
): Promise<void> {
  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from("social_posts")
    .update({
      status: "posted",
      tweet_id: head.tweet_id,
      tweet_url: head.tweet_url,
      thread_tweet_ids: reply_tweet_ids.length ? reply_tweet_ids : null,
      posted_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw wrapDbError(error, "social_posts markPosted");
}

export async function markFailed(
  id: string,
  reason: string,
  detail?: Record<string, unknown>,
): Promise<void> {
  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from("social_posts")
    .update({
      status: "failed",
      error_reason: reason,
      error_detail: detail ?? null,
    })
    .eq("id", id);
  if (error) throw wrapDbError(error, "social_posts markFailed");
}

/** Stuck `pending` rows (>5 min) get swept to `failed` so the cron can claim
 *  a fresh slot on a retry. We rely on X's own duplicate detection (~24h) to
 *  avoid double-posting if the original tweet actually went out. */
export async function sweepStuckPending(
  content_type: ContentType,
  platform: "x" = "x",
  minutes = 5,
): Promise<void> {
  const admin = getSupabaseAdmin();
  const cutoff = new Date(Date.now() - minutes * 60 * 1000).toISOString();
  const { error } = await admin
    .from("social_posts")
    .update({
      status: "failed",
      error_reason: "stuck_pending",
    })
    .eq("platform", platform)
    .eq("content_type", content_type)
    .eq("status", "pending")
    .lt("created_at", cutoff);
  if (error) throw wrapDbError(error, "social_posts sweepStuckPending");
}

function todayDate(): string {
  // ISO date in UTC — matches Postgres `current_date` default.
  return new Date().toISOString().slice(0, 10);
}
