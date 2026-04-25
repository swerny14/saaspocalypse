import { z } from "zod";

/**
 * Worst-case output-size budget (approx, with JSON overhead):
 *   overview        ≤  800 chars →  ~200 tokens
 *   prerequisites   ≤  500 chars →  ~130 tokens
 *   7 steps max     ≤ 2400 chars ea → ~4200 tokens
 *   stack_specifics ≤  900 chars →  ~225 tokens
 *   pitfalls        ≤  600 chars →  ~150 tokens
 *   ───────────────────────────────────────────
 *   total output                   ~4900 tokens
 *
 * Fits comfortably under MAX_TOKENS=6000 in lib/build_guide/llm.ts.
 * Any cap bump here needs a MAX_TOKENS bump too.
 */

export const LLMPromptSchema = z.object({
  label: z.string().min(1).max(50),
  prompt: z.string().min(20).max(500),
});

export const BuildStepSchema = z.object({
  n: z.number().int().min(1).max(20),
  title: z.string().min(1).max(80),
  body: z.string().min(1).max(450),
  est_time: z.string().min(1).max(30),
  llm_prompts: z.array(LLMPromptSchema).min(1).max(2),
});

export const LibrarySchema = z.object({
  name: z.string().min(1).max(60),
  version: z.string().max(30).optional(),
  purpose: z.string().min(1).max(100),
});

export const ReferenceSchema = z.object({
  label: z.string().min(1).max(80),
  why: z.string().min(1).max(120),
});

export const PitfallSchema = z.object({
  title: z.string().min(1).max(60),
  // 300 chars comfortably fits 1-2 sentences. At 200 Sonnet overshot reliably,
  // even under retry feedback — the cap was below the model's natural minimum
  // for a meaningful pitfall explanation.
  body: z.string().min(1).max(300),
});

export const StackSpecificsSchema = z.object({
  libraries: z.array(LibrarySchema).min(3).max(6),
  references: z.array(ReferenceSchema).max(4),
});

export const BuildGuideSchema = z
  .object({
    overview: z.string().min(1).max(800),
    prerequisites: z.array(z.string().min(1).max(100)).min(3).max(5),
    steps: z.array(BuildStepSchema).min(6).max(7),
    stack_specifics: StackSpecificsSchema,
    pitfalls: z.array(PitfallSchema).min(1).max(3),
  })
  .refine((g) => g.steps.every((s, i) => s.n === i + 1), {
    message: "steps must be numbered sequentially starting at 1",
    path: ["steps"],
  });

export type BuildGuide = z.infer<typeof BuildGuideSchema>;
export type BuildStep = z.infer<typeof BuildStepSchema>;
export type LLMPrompt = z.infer<typeof LLMPromptSchema>;
export type Library = z.infer<typeof LibrarySchema>;
export type Reference = z.infer<typeof ReferenceSchema>;
export type Pitfall = z.infer<typeof PitfallSchema>;
