import { z } from "zod";

/** Per-tweet hard cap. X allows 280, but we leave 10 chars of headroom for
 *  the t.co URL substitution, which can vary slightly with X's rules over
 *  time. The LLM is told 270 too. */
export const TWEET_MAX = 270;

/** What Claude returns from the `submit_post` tool. The Zod schema is
 *  intentionally permissive — per-template structural rules
 *  (single vs thread, link presence, link tweet) live in the pipeline. */
export const SocialPostOutputSchema = z
  .object({
    body: z
      .string()
      .min(20)
      .max(TWEET_MAX)
      .describe("The HEAD tweet body. ≤270 chars including any URL it contains."),
    thread_bodies: z
      .array(z.string().min(10).max(TWEET_MAX))
      .max(2)
      .optional()
      .describe(
        "Additional tweet bodies for threaded posts. Empty / omitted for single-tweet templates. Each ≤270 chars. The URL must NOT appear here.",
      ),
    includes_link: z
      .boolean()
      .describe(
        "True if the head tweet body contains an https:// URL. Used as a quick self-check.",
      ),
  })
  .refine(
    (d) => !d.includes_link || d.body.includes("https://"),
    {
      message: "includes_link is true but body has no https:// URL",
      path: ["body"],
    },
  );

export type SocialPostOutput = z.infer<typeof SocialPostOutputSchema>;
