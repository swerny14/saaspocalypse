import { TwitterApi, ApiResponseError } from "twitter-api-v2";

export type PostErrorReason =
  | "auth"
  | "rate_limited"
  | "duplicate"
  | "rejected"
  | "unknown";

export type PostResult =
  | {
      kind: "ok";
      head_tweet_id: string;
      head_tweet_url: string;
      reply_tweet_ids: string[];
    }
  | {
      kind: "error";
      reason: PostErrorReason;
      message: string;
      /** Populated when the HEAD tweet succeeded but a reply failed. The
       *  caller should treat the post as `posted` (head is the canonical
       *  share surface) and log the reply failure separately. */
      partial?: {
        head_tweet_id: string;
        head_tweet_url: string;
        reply_tweet_ids: string[];
      };
    };

function getCreds(): {
  appKey: string;
  appSecret: string;
  accessToken: string;
  accessSecret: string;
} | null {
  const appKey = process.env.X_API_KEY;
  const appSecret = process.env.X_API_SECRET;
  const accessToken = process.env.X_ACCESS_TOKEN;
  const accessSecret = process.env.X_ACCESS_TOKEN_SECRET;
  if (!appKey || !appSecret || !accessToken || !accessSecret) return null;
  return { appKey, appSecret, accessToken, accessSecret };
}

function tweetUrl(id: string): string {
  return `https://x.com/i/web/status/${id}`;
}

function classifyError(err: unknown): {
  reason: PostErrorReason;
  message: string;
} {
  if (err instanceof ApiResponseError) {
    if (err.isAuthError) {
      return { reason: "auth", message: errMessage(err) };
    }
    if (err.code === 429 || err.hasErrorCode(88)) {
      return { reason: "rate_limited", message: errMessage(err) };
    }
    // 187 = "Status is a duplicate" (v1.1) / "duplicate content" (v2 maps to 403).
    if (err.hasErrorCode(187)) {
      return { reason: "duplicate", message: errMessage(err) };
    }
    if (err.code >= 400 && err.code < 500) {
      return { reason: "rejected", message: errMessage(err) };
    }
  }
  return {
    reason: "unknown",
    message: err instanceof Error ? err.message : String(err),
  };
}

function errMessage(err: ApiResponseError): string {
  const codes: number[] = [];
  for (const e of err.errors ?? []) {
    if (e && typeof e === "object" && "code" in e && typeof e.code === "number") {
      codes.push(e.code);
    }
  }
  const first = err.errors?.[0];
  const detail =
    first && "message" in first && typeof first.message === "string"
      ? first.message
      : first && "detail" in first && typeof first.detail === "string"
        ? first.detail
        : err.message;
  const codePart = codes.length ? ` codes=[${codes.join(",")}]` : "";
  return `HTTP ${err.code}${codePart}: ${detail}`;
}

/** Posts a single tweet OR a thread. parts.length === 1 → single tweet.
 *  parts.length > 1 → thread (head + N replies). The head tweet carries
 *  the URL; replies are bonus context. */
export async function postContent(parts: string[]): Promise<PostResult> {
  if (parts.length === 0) {
    return { kind: "error", reason: "rejected", message: "no parts to post" };
  }
  const creds = getCreds();
  if (!creds) {
    return {
      kind: "error",
      reason: "auth",
      message: "X_API_KEY / X_API_SECRET / X_ACCESS_TOKEN / X_ACCESS_TOKEN_SECRET not configured",
    };
  }
  const client = new TwitterApi({
    appKey: creds.appKey,
    appSecret: creds.appSecret,
    accessToken: creds.accessToken,
    accessSecret: creds.accessSecret,
  });

  // Post head.
  let head;
  try {
    head = await client.v2.tweet(parts[0]);
  } catch (e) {
    const c = classifyError(e);
    return { kind: "error", reason: c.reason, message: c.message };
  }
  const head_tweet_id = head.data.id;
  const head_tweet_url = tweetUrl(head_tweet_id);

  if (parts.length === 1) {
    return { kind: "ok", head_tweet_id, head_tweet_url, reply_tweet_ids: [] };
  }

  // Post replies sequentially, each in_reply_to the immediately previous.
  const reply_tweet_ids: string[] = [];
  let in_reply_to = head_tweet_id;
  for (let i = 1; i < parts.length; i++) {
    try {
      const reply = await client.v2.tweet(parts[i], {
        reply: { in_reply_to_tweet_id: in_reply_to },
      });
      reply_tweet_ids.push(reply.data.id);
      in_reply_to = reply.data.id;
    } catch (e) {
      const c = classifyError(e);
      // Head went out — treat as partial success. The caller should mark the
      // row `posted` using the head's id/url and log the reply failure.
      return {
        kind: "error",
        reason: c.reason,
        message: `reply ${i} failed: ${c.message}`,
        partial: { head_tweet_id, head_tweet_url, reply_tweet_ids },
      };
    }
  }
  return { kind: "ok", head_tweet_id, head_tweet_url, reply_tweet_ids };
}
