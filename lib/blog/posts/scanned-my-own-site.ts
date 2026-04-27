import type { Post } from "../schema";

export const post: Post = {
  slug: "scanned-my-own-site",
  title: "I scanned my own site. It said don't bother.",
  excerpt:
    "I pasted saaspocalypse.dev into my own scanner, mostly as a joke. It returned DON'T-tier with a 12-week estimate and a one-liner I'm still not over.",
  date: "2026-04-02",
  read_time: "3 min",
  tags: ["confession", "meta"],
  category: "confessions",
  author: "saaspocalypse",
  body: [
    {
      type: "p",
      text: "I scanned my own site. It said don't bother.",
    },
    {
      type: "p",
      text: "I should explain. The product I'm building is a scanner that tells you whether you could plausibly build a given SaaS yourself. It returns a tier (WEEKEND, MONTH, DON'T), a time estimate, a stack receipt, and a one-liner of varying meanness. I have been working on it for, depending on how generously you count, six to nine months. Last week, mostly as a joke, I pasted saaspocalypse.dev into the URL field and clicked judge it.",
    },
    {
      type: "p",
      text: "The verdict came back DON'T.",
    },
    {
      type: "h2",
      text: "the time estimate",
    },
    {
      type: "p",
      text: "The robot, which is a Claude model with a system prompt I have personally tuned over forty-six revisions to be merciless, estimated 12 weeks. It said the build required integrations with four LLM providers (we use one, but it didn't know that), real-time SSE streaming UX (correct), atomic per-domain locking under concurrent traffic (correct), and what it called \"an unreasonable amount of typography decisions.\" It listed Stripe webhooks, magic links, OG image generation with Satori, and the phrase \"vibes-based copywriting\" under risks.",
    },
    {
      type: "p",
      text: "I had built all of these. I had built them in less than 12 weeks. The robot did not care. The robot does not know me. The robot has been instructed not to know me, on purpose, by me.",
    },
    {
      type: "h2",
      text: "the take",
    },
    {
      type: "p",
      text: "Reports include a one-liner field, which we call take. It's the place the robot is allowed to be funny. It said:",
    },
    {
      type: "callout",
      text: "this is a tool for building tools that decide whether to build tools. consider therapy.",
    },
    {
      type: "p",
      text: "I read this in my own kitchen, alone, at 11:47 pm.",
    },
    {
      type: "h2",
      text: "what the robot got right",
    },
    {
      type: "p",
      text: "It got the moat wrong (we don't have one, which is fine; nobody is going to clone a corny pun-based marketing site). It got the stack mostly right. It got the time estimate wrong by 6x, but in a generous direction; it thought I was a more competent person than I was, which is a kind of mercy.",
    },
    {
      type: "p",
      text: "What it got right was the underlying observation, which is that this is a website that asks could you build this, and the answer to could you build this website is, somewhat, no. Not at the speed the robot's customers are hoping. The product is a slow, opinionated, taste-having thing, and taste does not bench-press well in week-count form.",
    },
    {
      type: "h2",
      text: "the verdict",
    },
    {
      type: "p",
      text: "I built it anyway.",
    },
    {
      type: "p",
      text: "You're reading it.",
    },
    {
      type: "p",
      text: "If I had taken the verdict at face value, I would have closed the tab and gone back to my todo app. Instead I closed the tab and shipped the next page of the marketing site. The verdict was correct in the sense that this was not a sensible weekend project. The verdict was incorrect in the sense that I was not, on the night I started it, a sensible person.",
    },
    {
      type: "p",
      text: "The product, which is a tool that gives you a verdict, is a verdict it would give itself a DON'T on. There's a name for this in logic and I do not remember it. There's also a name for this in indie hacking, and the name is shipping.",
    },
  ],
};
