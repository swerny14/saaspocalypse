import type { Post } from "../schema";

export const post: Post = {
  slug: "slow-tax-of-stacks",
  title: "The slow tax of stacks.",
  excerpt:
    "Subscriptions are priced to disappear. The cost isn't the nine dollars a month; it's the slow loss of the muscle that decides what you should be paying for.",
  date: "2026-04-09",
  read_time: "6 min",
  tags: ["pricing", "economics"],
  category: "essays",
  author: "saaspocalypse",
  body: [
    {
      type: "p",
      text: "The cheapest thing in software is a subscription. It is, by design, the cheapest thing. Nine dollars a month, nineteen dollars a month, twenty-nine, forty-nine. They are priced at the upper bound of \"easily ignored on a credit card statement.\" This is not an accident. It is what makes the form of the business work.",
    },
    {
      type: "p",
      text: "I want to talk about what this costs you, but in a way that is not the usual moralism. Subscriptions are fine. I have many. The argument here isn't that you should cancel them. It's that the way you decide which subscriptions to take on is, for most of us, completely uncalibrated, because the prices are too small to register and the alternative cost is invisible. The result is a long, slow tax that nobody quite remembers signing up for.",
    },
    {
      type: "h2",
      text: "The math everyone does",
    },
    {
      type: "p",
      text: "Here is the math an indie founder runs in their head, roughly twelve times a year, when they sign up for a new tool: nine dollars a month, that's nothing.",
    },
    {
      type: "p",
      text: "The math is correct. Nine dollars a month is, in fact, nothing. The thing the math omits is that you are not running it once. You are running it twelve times in a single year, because you signed up for twelve nine-dollar-a-month tools, and the math at the end is not nine dollars a month. It is one hundred and eight, which is not nothing, but is also not the number that hurts. The number that hurts is the slope.",
    },
    {
      type: "p",
      text: "Three years in, the average indie SaaS founder I've talked to is paying somewhere between four hundred and twelve hundred dollars a month for tools, depending on how many of those years included a Notion AI add-on. None of them set out to do this. None of them notice it on the way. The default behavior of a small subscription, repeated, is to disappear into the background, the way rent disappears, the way gym membership disappears.",
    },
    {
      type: "p",
      text: "The thing about prices that disappear is that they do not stop being prices. They stop being decisions.",
    },
    {
      type: "h2",
      text: "What you're actually paying for",
    },
    {
      type: "p",
      text: "If the math were just money, this would not be an essay. Money is not the most expensive thing in the situation.",
    },
    {
      type: "p",
      text: "What you are paying for, when you accumulate a stack of subscriptions, is more like a posture. The posture is: someone else has solved this. You have decided, by paying them, that whatever your transcript-summarization tool does is a thing that does not need rethinking. It is now a noun in your stack. You will architect around it. You will design pages that link to it. You will, when prospective customers ask about your transcripts, send them to it.",
    },
    {
      type: "p",
      text: "This is fine when the noun is well-chosen. Stripe is a noun. Hosting is a noun. The kind of thing that is the same for everyone and that you genuinely do not want to think about.",
    },
    {
      type: "p",
      text: "It is less fine when the noun is the thing that makes your product feel like itself. There is a moment, somewhere around three years in, where founders look at their stack and realize that the parts of the product they care about most are also the parts that are running on someone else's roadmap. The subscription was nine dollars a month. The cost was that the feel of their product is now subject to a vendor's quarterly priorities. They are, in a sense, paying nine dollars a month to not own their own software.",
    },
    {
      type: "h2",
      text: "Defaultism",
    },
    {
      type: "p",
      text: "The mechanism that gets you here is not greed, on the vendor's part, or laziness, on yours. It's defaultism.",
    },
    {
      type: "p",
      text: "Defaultism is the slow, mostly invisible process by which a paid tool becomes the way it's done. The first time someone in indie circles writes about Tool X, you note it, mildly. The fifth time, you assume Tool X is what serious people use. The fifteenth, you've been quietly using Tool X for a year, and the thought of not using it would feel like the thought of writing your own Postgres.",
    },
    {
      type: "p",
      text: "There are tools where this is correct. Postgres is a good example, in fact: nobody should write their own Postgres, and the convergence on Postgres is a sign of taste rather than capitulation. But most tools are not Postgres. Most tools are competent, mid-tier, perfectly usable products that became the default through marketing and momentum, and that you adopted by osmosis rather than by decision.",
    },
    {
      type: "callout",
      text: "the price you paid was nine dollars a month. the cost was deciding less often.",
    },
    {
      type: "p",
      text: "The version of this you can feel is the moment you try to leave a tool and realize the tool is now a load-bearing wall. The version you can't feel is the years you spent not asking whether you should be using it in the first place.",
    },
    {
      type: "h2",
      text: "The build-it-yourself reframe",
    },
    {
      type: "p",
      text: "I am not here to tell you to go build everything. That is the moralizing version of this argument and it loses on the merits. There are things you should buy. There are weeks where building anything is the wrong move.",
    },
    {
      type: "p",
      text: "What I am here to tell you is that build it yourself is one valid response, and it tends to be the response that defaultism trains you out of considering. It is not, generally, more expensive in money. The math sometimes wildly favors building, especially when the tool charges per-seat and you are one seat. It is sometimes more expensive in time, but only sometimes, and the time cost is usually a one-time investment that buys you understanding the rented tool would never have given you.",
    },
    {
      type: "p",
      text: "When I say build it yourself I do not mean rewrite Postgres. I mean: the next time you are about to put a nine-dollar-a-month tool into the load-bearing part of your product, ask yourself whether the build cost is actually higher than the year-five vendor lock-in cost, and answer honestly. The honest answer, surprisingly often, is that you should build the thing.",
    },
    {
      type: "h2",
      text: "What this has to do with saaspocalypse",
    },
    {
      type: "p",
      text: "The reason I built a tool that scores the wedge on a given SaaS is, partly, this. The default frame in indie hacker discourse is that buying tools is the default and building them is the deviation, and the burden of proof is on the deviation. I think the burden of proof should sit on the side it actually sits on, which is whichever of the two options you'll regret less in three years.",
    },
    {
      type: "p",
      text: "The slow tax of stacks is not nine dollars a month. It is the gradual loss of the muscle that decides what you should be paying for. The scanner exists, in part, to put the muscle back.",
    },
    {
      type: "p",
      text: "That muscle is what you use to make a product that is not, twelve subscriptions in, a thin layer of opinions on top of someone else's stack. Whether you build or buy, on a given Tuesday, matters less than whether you are still asking. Defaultism wins by closing the question.",
    },
    {
      type: "p",
      text: "Keep the question open. The rest sorts itself out.",
    },
  ],
};
