import { logError } from "@/lib/error_log";
import {
  getRecentReports,
  getAllReportsForSitemap,
  type StoredReport,
} from "@/lib/db/reports";
import {
  getRecentOriginalBodies,
  getRecentlyPostedSlugs,
  getTodaySlot,
  insertDryRunPost,
  insertPendingPost,
  markFailed,
  markPosted,
  sweepStuckPending,
  SocialSlotTakenError,
  type ContentType,
  type SocialPost,
} from "@/lib/db/social_posts";
import { SITE_URL } from "@/lib/seo/meta";
import {
  ORIGINAL_TEMPLATES,
  REPORT_TEMPLATES,
  pickRandom,
  reportTemplatesForTier,
  type OriginalTemplate,
  type Template,
} from "./templates";
import { generateSocialPost, type GenerateInput } from "./llm";
import { TWEET_MAX } from "./schema";
import { postContent, type PostResult } from "./x_client";
import type { Tier } from "@/lib/scanner/schema";

export type PipelineMode = "live" | "dry_run";
export type PipelineInput = {
  content_type: ContentType;
  mode: PipelineMode;
  signal?: AbortSignal;
};

export type PipelineResult =
  | {
      kind: "posted";
      post_id: string;
      tweet_id: string;
      tweet_url: string;
      body: string;
      thread_bodies: string[];
      reply_tweet_ids: string[];
    }
  | {
      kind: "dry_run";
      body: string;
      thread_bodies: string[];
      link_url: string | null;
      template_id: string;
      content_type: ContentType;
    }
  | { kind: "skipped"; reason: "already_posted_today" }
  | { kind: "failed"; reason: string; message: string };

const COOLDOWN_DAYS_DEFAULT = 30;
const COOLDOWN_DAYS_FALLBACK = 14;
const MIN_REPORTS_FOR_DIRECTORY_RIFF = 20;

const TIER_WEIGHTS: { tier: Tier; weight: number }[] = [
  { tier: "WEEKEND", weight: 60 },
  { tier: "MONTH", weight: 25 },
  { tier: "DON'T", weight: 15 },
];

export async function runDailySocial(
  input: PipelineInput,
): Promise<PipelineResult> {
  const { content_type, mode } = input;

  // 1. Idempotency check (live mode only).
  if (mode === "live") {
    // Sweep any stuck pending row first so retries can claim a fresh slot.
    try {
      await sweepStuckPending(content_type);
    } catch (e) {
      // Non-fatal; just log and continue.
      void logError({
        scope: "social",
        reason: "sweep_failed",
        message: e instanceof Error ? e.message : String(e),
      });
    }

    const existing = await getTodaySlot(content_type).catch(() => null);
    if (existing && (existing.status === "posted" || existing.status === "pending")) {
      return { kind: "skipped", reason: "already_posted_today" };
    }
  }

  // 2. Generate the content.
  const generated =
    content_type === "report"
      ? await generateForReport(input)
      : await generateForOriginal(input);
  if (generated.kind === "failed") return generated;

  // 3. Persist + post.
  const { template, body, thread_bodies, link_url, ref_id, ref_slug } = generated;
  if (mode === "dry_run") {
    try {
      await insertDryRunPost({
        content_type,
        template_id: template.id,
        ref_id,
        ref_slug,
        body,
        thread_bodies: thread_bodies.length ? thread_bodies : null,
        link_url,
      });
    } catch (e) {
      void logError({
        scope: "social",
        reason: "dry_run_persist_failed",
        message: e instanceof Error ? e.message : String(e),
      });
    }
    return {
      kind: "dry_run",
      body,
      thread_bodies,
      link_url,
      template_id: template.id,
      content_type,
    };
  }

  // Live mode: claim the slot, then post.
  let pending: SocialPost;
  try {
    pending = await insertPendingPost({
      content_type,
      template_id: template.id,
      ref_id,
      ref_slug,
      body,
      thread_bodies: thread_bodies.length ? thread_bodies : null,
      link_url,
    });
  } catch (e) {
    if (e instanceof SocialSlotTakenError) {
      return { kind: "skipped", reason: "already_posted_today" };
    }
    void logError({
      scope: "social",
      reason: "claim_slot_failed",
      message: e instanceof Error ? e.message : String(e),
      detail: { content_type, template_id: template.id },
    });
    return {
      kind: "failed",
      reason: "claim_slot_failed",
      message: e instanceof Error ? e.message : String(e),
    };
  }

  const parts = [body, ...thread_bodies];
  const result: PostResult = await postContent(parts);

  if (result.kind === "ok") {
    try {
      await markPosted(
        pending.id,
        { tweet_id: result.head_tweet_id, tweet_url: result.head_tweet_url },
        result.reply_tweet_ids,
      );
    } catch (e) {
      void logError({
        scope: "social",
        reason: "mark_posted_failed",
        refId: pending.id,
        message: e instanceof Error ? e.message : String(e),
        detail: { tweet_id: result.head_tweet_id },
      });
      // Non-fatal — the tweet did go out. Surface as posted.
    }
    return {
      kind: "posted",
      post_id: pending.id,
      tweet_id: result.head_tweet_id,
      tweet_url: result.head_tweet_url,
      body,
      thread_bodies,
      reply_tweet_ids: result.reply_tweet_ids,
    };
  }

  // result.kind === "error"
  if (result.partial) {
    // Head went out, reply failed. Treat as posted; log the reply failure.
    try {
      await markPosted(
        pending.id,
        {
          tweet_id: result.partial.head_tweet_id,
          tweet_url: result.partial.head_tweet_url,
        },
        result.partial.reply_tweet_ids,
      );
    } catch (e) {
      void logError({
        scope: "social",
        reason: "mark_posted_failed",
        refId: pending.id,
        message: e instanceof Error ? e.message : String(e),
      });
    }
    void logError({
      scope: "social",
      reason: "thread_partial",
      refId: pending.id,
      refSlug: ref_slug,
      message: result.message,
      detail: {
        head_tweet_id: result.partial.head_tweet_id,
        reply_count_attempted: thread_bodies.length,
        reply_count_succeeded: result.partial.reply_tweet_ids.length,
      },
    });
    return {
      kind: "posted",
      post_id: pending.id,
      tweet_id: result.partial.head_tweet_id,
      tweet_url: result.partial.head_tweet_url,
      body,
      thread_bodies,
      reply_tweet_ids: result.partial.reply_tweet_ids,
    };
  }

  // No partial success — total post failure.
  await emitSocialError(pending.id, `x_${result.reason}`, result.message, {
    content_type,
    template_id: template.id,
    ref_slug,
  });
  return {
    kind: "failed",
    reason: `x_${result.reason}`,
    message: result.message,
  };
}

async function emitSocialError(
  post_id: string | null,
  reason: string,
  message: string,
  detail?: Record<string, unknown>,
): Promise<void> {
  if (post_id) {
    try {
      await markFailed(post_id, reason, detail);
    } catch (e) {
      void logError({
        scope: "social",
        reason: "mark_failed_failed",
        refId: post_id,
        message: e instanceof Error ? e.message : String(e),
      });
    }
  }
  await logError({
    scope: "social",
    reason,
    refId: post_id ?? null,
    refSlug:
      detail && typeof detail.ref_slug === "string"
        ? (detail.ref_slug as string)
        : null,
    message,
    detail,
  });
}

/* ──────────────── content generation ──────────────── */

type GenerateOk = {
  kind: "ok";
  template: Template;
  body: string;
  thread_bodies: string[];
  link_url: string | null;
  ref_id: string | null;
  ref_slug: string | null;
};

type GenerateFailed = {
  kind: "failed";
  reason: string;
  message: string;
};

async function generateForReport(
  input: PipelineInput,
): Promise<GenerateOk | GenerateFailed> {
  const picked = await pickReport();
  if (!picked) {
    await emitSocialError(null, "empty_report_corpus", "no eligible reports for daily slot", {
      content_type: "report",
    });
    return {
      kind: "failed",
      reason: "empty_report_corpus",
      message: "no eligible reports for daily slot",
    };
  }
  const { report } = picked;
  const template = pickRandom(reportTemplatesForTier(report.tier));
  const link_url = `${SITE_URL}/r/${report.slug}`;

  const llmInput: GenerateInput = {
    kind: "report",
    template,
    report,
    link_url,
  };
  const out = await generateSocialPost(llmInput, input.signal);
  if (out.kind === "error") {
    await emitSocialError(null, out.reason, out.message, {
      content_type: "report",
      template_id: template.id,
      ref_slug: report.slug,
    });
    return { kind: "failed", reason: out.reason, message: out.message };
  }

  const validated = validateGeneratedPost(out, template, link_url);
  if (validated.kind === "failed") {
    await emitSocialError(null, validated.reason, validated.message, {
      content_type: "report",
      template_id: template.id,
      ref_slug: report.slug,
    });
    return validated;
  }

  return {
    kind: "ok",
    template,
    body: out.body,
    thread_bodies: out.thread_bodies,
    link_url,
    ref_id: report.id,
    ref_slug: report.slug,
  };
}

async function generateForOriginal(
  input: PipelineInput,
): Promise<GenerateOk | GenerateFailed> {
  const sitemap = await getAllReportsForSitemap(50_000).catch(() => []);
  const directoryCount = sitemap.length;

  const eligible: OriginalTemplate[] = ORIGINAL_TEMPLATES.filter((t) =>
    t.id === "original.directory_riff"
      ? directoryCount >= MIN_REPORTS_FOR_DIRECTORY_RIFF
      : true,
  );
  if (eligible.length === 0) {
    return {
      kind: "failed",
      reason: "no_original_templates_eligible",
      message: "no original templates available",
    };
  }
  const template = pickRandom(eligible);

  const recents = await getRecentOriginalBodies(10).catch(() => [] as string[]);
  const directory_url = `${SITE_URL}/directory`;
  const link_url = template.links_to_directory ? directory_url : null;

  const llmInput: GenerateInput = {
    kind: "original",
    template,
    recent_originals: recents,
    directory_url,
    directory_count: directoryCount,
  };
  const out = await generateSocialPost(llmInput, input.signal);
  if (out.kind === "error") {
    await emitSocialError(null, out.reason, out.message, {
      content_type: "original",
      template_id: template.id,
    });
    return { kind: "failed", reason: out.reason, message: out.message };
  }

  const validated = validateGeneratedPost(out, template, link_url);
  if (validated.kind === "failed") {
    await emitSocialError(null, validated.reason, validated.message, {
      content_type: "original",
      template_id: template.id,
    });
    return validated;
  }

  return {
    kind: "ok",
    template,
    body: out.body,
    thread_bodies: out.thread_bodies,
    link_url,
    ref_id: null,
    ref_slug: null,
  };
}

/* ──────────────── selection helpers ──────────────── */

async function pickReport(): Promise<{ report: StoredReport } | null> {
  const reports = await getRecentReports(200).catch(() => [] as StoredReport[]);
  if (reports.length === 0) return null;

  const tryWithCooldown = async (
    days: number,
  ): Promise<StoredReport | null> => {
    const recentSlugs = new Set(
      await getRecentlyPostedSlugs(days).catch(() => [] as string[]),
    );
    const eligible = reports.filter((r) => !recentSlugs.has(r.slug));
    return weightedTierPick(eligible);
  };

  const first = await tryWithCooldown(COOLDOWN_DAYS_DEFAULT);
  if (first) return { report: first };
  const second = await tryWithCooldown(COOLDOWN_DAYS_FALLBACK);
  if (second) return { report: second };
  return null;
}

function weightedTierPick(reports: StoredReport[]): StoredReport | null {
  if (reports.length === 0) return null;
  const byTier: Record<Tier, StoredReport[]> = {
    WEEKEND: [],
    MONTH: [],
    "DON'T": [],
  };
  for (const r of reports) byTier[r.tier].push(r);

  const presentWeights = TIER_WEIGHTS.filter(
    (t) => byTier[t.tier].length > 0,
  );
  if (presentWeights.length === 0) return null;

  const total = presentWeights.reduce((s, t) => s + t.weight, 0);
  let roll = Math.random() * total;
  for (const t of presentWeights) {
    if (roll < t.weight) return pickRandom(byTier[t.tier]);
    roll -= t.weight;
  }
  // Numerical-edge fallback.
  return pickRandom(byTier[presentWeights[presentWeights.length - 1].tier]);
}

/* ──────────────── per-template structural validation ──────────────── */

function validateGeneratedPost(
  out: { body: string; thread_bodies: string[] },
  template: Template,
  expected_link: string | null,
): { kind: "ok" } | GenerateFailed {
  // 1. tweet_count alignment.
  const actualCount = 1 + out.thread_bodies.length;
  if (actualCount !== template.tweet_count) {
    return {
      kind: "failed",
      reason: "wrong_tweet_count",
      message: `expected ${template.tweet_count} tweet(s), got ${actualCount}`,
    };
  }

  // 2. Per-tweet length cap (Zod also checks; defense in depth).
  if (out.body.length > TWEET_MAX) {
    return {
      kind: "failed",
      reason: "tweet_too_long",
      message: `head tweet ${out.body.length} chars > ${TWEET_MAX}`,
    };
  }
  for (const part of out.thread_bodies) {
    if (part.length > TWEET_MAX) {
      return {
        kind: "failed",
        reason: "tweet_too_long",
        message: `reply tweet ${part.length} chars > ${TWEET_MAX}`,
      };
    }
  }

  // 3. Link presence + placement.
  if (expected_link) {
    if (!out.body.includes(expected_link)) {
      return {
        kind: "failed",
        reason: "missing_link",
        message: `head tweet missing required link: ${expected_link}`,
      };
    }
    for (const part of out.thread_bodies) {
      if (part.includes(expected_link) || part.includes("https://")) {
        return {
          kind: "failed",
          reason: "link_on_reply",
          message: "URL appears in a reply tweet — must be only on head",
        };
      }
    }
  } else {
    // Templates without a link must have no URL anywhere.
    if (out.body.includes("https://")) {
      return {
        kind: "failed",
        reason: "unexpected_link",
        message: "head tweet contains a URL but template has no link",
      };
    }
  }

  return { kind: "ok" };
}

/** Re-export used by the route. */
export { REPORT_TEMPLATES, ORIGINAL_TEMPLATES };
