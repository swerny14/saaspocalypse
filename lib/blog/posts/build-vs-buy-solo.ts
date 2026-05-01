import type { Post } from "../schema";

export const post: Post = {
  slug: "build-vs-buy-solo",
  title: "Build-vs-buy is broken when you're one person.",
  excerpt:
    "The framework was written for managers buying tools for engineers. For a solo founder before launch, your hour is worth zero on the open market and a great deal more inside your own product.",
  date: "2026-04-16",
  read_time: "7 min",
  tags: ["frameworks", "solo-founder"],
  category: "essays",
  author: "saaspocalypse",
  body: [
    {
      type: "p",
      text: "There's a piece of advice that gets handed to indie founders the way you'd hand a stranger a flyer: don't build what you can buy. It comes packaged in confidence. Senior people say it. Books say it. People who have just read books say it, often within hours.",
    },
    {
      type: "p",
      text: "I want to argue that for one specific person, the solo founder before launch, this advice is not just wrong but actively wrong, in the way that a compass with the wrong polarity is worse than no compass.",
    },
    {
      type: "h2",
      text: "Whose hour is the framework pricing?",
    },
    {
      type: "p",
      text: "Build-vs-buy was not invented for indie hackers. It was invented for managers in mid-sized companies trying to decide whether their engineering team should write the auth layer or use Auth0. The math is straightforward: an engineer costs $200,000 a year fully loaded, the tool costs $1,000 a month, the work would take a quarter, therefore buy the tool.",
    },
    {
      type: "p",
      text: "The math is correct. The reason it's correct is that the engineer's time has, in fact, been bought. Someone is paying $50,000 for that quarter regardless of how the engineer spends it. If the engineer spends it on auth, the auth gets paid for in salary. If the engineer spends it on something else, the auth still costs $1,000 a month, but now the company also gets the something else. There is no scenario in which building auth is free.",
    },
    {
      type: "p",
      text: "The framework lives or dies on this assumption. It assumes the cost of an hour of your time is a market price someone else is currently paying.",
    },
    {
      type: "h2",
      text: "What \"your hour is worth\" actually means",
    },
    {
      type: "p",
      text: "\"Your time is worth $X an hour\" is a sentence that sounds intuitive but only computes inside a market. Time has a price the way a tomato has a price: there has to be someone willing to pay it.",
    },
    {
      type: "p",
      text: "For the engineer at the mid-sized company, that price is observable. They know what the next-best use of the hour is, because they have a backlog and a manager and a salary curve. They are not making this number up.",
    },
    {
      type: "p",
      text: "For a solo founder six months before launch, the price is fictional. There is no buyer for the hour. Revenue is zero. The alternative use is not \"ship a feature your users want,\" because the users do not exist yet. The alternative use, candidly, is laundry.",
    },
    {
      type: "p",
      text: "This is not a knock. Pre-launch is a real and important state. But the textbook framework was not written for this state. Plugging $150 an hour into a calculation when the actual market clearing price for your hour is zero is the kind of error compound interest is made of. You buy a tool to free up an hour you weren't going to sell anyway, and now you're $39 a month poorer for the convenience of having had no money to begin with.",
    },
    {
      type: "h2",
      text: "What a solo founder is buying when they build",
    },
    {
      type: "p",
      text: "When a solo pre-launch founder considers building rather than buying, the question they're really answering isn't what's the cheapest way to get auth into my product. It's something closer to: what do I need to understand about my product, and which tools will let me understand it, and which will hide it from me.",
    },
    {
      type: "p",
      text: "Building forces three things on you, in roughly this order.",
    },
    {
      type: "p",
      text: "First, building teaches you the shape of the problem. The first time you write your own auth, you learn what an auth flow actually consists of. The fifteenth time you don't, because by then you've abstracted the lessons. But the first time matters, and most solo founders are still in their first time for most of the things they're building. Buying the tool means handing over the lesson along with the work.",
    },
    {
      type: "p",
      text: "Second, building gives you control over the unsexy edges. Tools are designed for the average customer, which means they are designed for nobody specifically. The thing a tool can't do is the thing your users will, two years from now, complain about most. If you built it, you can fix it. If you bought it, you can submit a feature request and wait. Most \"we've taken note of your feedback\" emails are sent to founders who could've spent the four hours writing it themselves.",
    },
    {
      type: "p",
      text: "Third, and this is the one nobody writes down, building gives you a piece of the system that's yours. Not in a possessive sense. In a load-bearing sense. The parts of your product you built yourself are the parts you can compose with. The parts you bought are bricks; you can stack them, but you can't shape them. Most products that feel cohesive are cohesive because the founder shaped enough of the bricks to make them fit. Most products that feel like a Frankenstein of integrations are Frankenstein because the founder priced their hour at $150 and bought the bricks pre-cut.",
    },
    {
      type: "callout",
      text: "cost is the wrong axis. the right axis is what you'd lose by not having built it.",
    },
    {
      type: "h2",
      text: "The right question to ask",
    },
    {
      type: "p",
      text: "If you take the argument seriously, the question for a solo founder isn't is it cheaper to build or buy this. The question is: what would I lose by not having built this.",
    },
    {
      type: "p",
      text: "For some pieces, the answer is genuinely nothing. You will not regret buying Stripe. The cost of building payments is too high, the cost of getting payments wrong is too high, and the lessons from building payments, most of them, are not lessons that compose into the rest of your product. Stripe is the canonical buy. So is hosting. So, mostly, is email delivery.",
    },
    {
      type: "p",
      text: "For other pieces, the answer is a lot. The data layer of your product is not a thing you should buy in pre-built form, because the data layer determines the shape of every feature you'll ever ship. The core interaction loop of your product is not a thing you should buy, because if you bought it you'd be shipping someone else's product with your skin on it. The pricing page is not a thing you should buy, because the pricing page is the sentence-level expression of your taste.",
    },
    {
      type: "p",
      text: "The framework that survives this is not build vs. buy. It's: buy the things you'd sleep through. Build the things you'd want to be awake for.",
    },
    {
      type: "h2",
      text: "Why I built saaspocalypse",
    },
    {
      type: "p",
      text: "I built saaspocalypse because I noticed that people I respect, careful, technically capable, taste-having people, were running this calculation badly. They were pricing their hour at salaries they didn't have, watching the math come out in favor of buying tools, and ending up with products that looked like a buffet of subscriptions and felt, in use, like nothing in particular.",
    },
    {
      type: "p",
      text: "The scanner produces a verdict (a wedge score, a thinnest-moat axis, a stack receipt), but the underlying question it's trying to answer for you is the one this essay is about. Not is this cheap to build, but: would building it teach you something the tool would hide.",
    },
    {
      type: "p",
      text: "If the answer is yes, the framework you grew up with is going to lie to you. It was written by managers about engineers in companies that were paying for both. You are not those people. Your hour is worth zero on the open market, and a great deal more inside your own product.",
    },
    {
      type: "p",
      text: "Build the things you'd want to be awake for. Buy the things you'd sleep through. The rest is bookkeeping.",
    },
  ],
};
