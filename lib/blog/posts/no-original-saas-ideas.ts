import type { Post } from "../schema";

export const post: Post = {
  slug: "no-original-saas-ideas",
  title: "There are no original SaaS ideas. That's good news.",
  excerpt:
    "Saturation isn't a deterrent. It's a buy signal. A note on what's actually scarce in software, and why originality is the cheapest input you can bring.",
  date: "2026-04-26",
  read_time: "8 min",
  tags: ["manifesto", "originality"],
  category: "essays",
  author: "saaspocalypse",
  featured: true,
  body: [
    {
      type: "p",
      text: "There's a thing people say about indie SaaS ideas, and they say it as though it settles the matter: it's already been done.",
    },
    {
      type: "p",
      text: "I have come to believe this is not the deterrent people think it is. It is, if anything, a buy signal. The fact that forty companies sell project management tools, all of them moderately successful, all of them swearing the others got it wrong, is the indicator that a product in this space can be a business. The originality of an idea has a strange relationship to its fundability. The relationship is, roughly, that there is no relationship.",
    },
    {
      type: "p",
      text: "This sounds slightly unhinged when you say it out loud, so let me argue it.",
    },
    {
      type: "h2",
      text: "Originality is a status game, not a market signal",
    },
    {
      type: "p",
      text: "The impulse to be original comes mostly from places that don't pay you. It comes from school, where you got points for not having seen the source material before. It comes from art criticism, where being derivative is a moral failing. It comes from open-source culture, where the highest praise is novel approach and the worst review is yet another framework.",
    },
    {
      type: "p",
      text: "Markets do not work this way. Markets reward fit. Fit is not novelty. Fit is: this thing solves a problem someone is currently solving in a worse way, and the better way is mine, and I told them about it before they got bored.",
    },
    {
      type: "p",
      text: "You can verify this with a brief tour of the products people admire most.",
    },
    {
      type: "p",
      text: "Notion was Evernote with database tables and better typography. The thing that made it special was not the idea, because the idea is documents you can write in, but the taste with which the form was reapplied. Linear was Jira, but built by a team that had used Jira and could not stop wincing about it. Stripe was Braintree, but without the sales team you had to talk to. Loom was Quicktime plus an upload button. Cursor is VS Code with a chat panel. ChatGPT, the consumer product, is GPT-3 with a text box, and the model existed for two years before anyone bothered to wrap it.",
    },
    {
      type: "p",
      text: "Every one of these companies got told they were doing something that already existed. Every one of them was right.",
    },
    {
      type: "h2",
      text: "What gets confused with originality",
    },
    {
      type: "p",
      text: "What people are pointing at when they call a SaaS idea unoriginal is usually one of two things, and these things are not the same.",
    },
    {
      type: "p",
      text: "The first is form: the kind of product. A note-taking app. A CRM. An invoicing tool. A scheduler. There are roughly fifty product forms, and we have already discovered them. Anyone shipping a note-taking app today is shipping in a known form. This is fine. This is good. The form gives you a starting point, an existing customer who already knows they want this kind of thing, and a measurable wedge of dissatisfaction with the current options.",
    },
    {
      type: "p",
      text: "The second is fit: the actual delta between what you ship and what the incumbent has on the same Tuesday afternoon. This is where everything happens. Two products in the same form can have entirely different fit. Notion and Coda are both note-taking-database hybrids; they coexist because their fits diverge along axes most users can't articulate but instantly feel.",
    },
    {
      type: "p",
      text: "When someone tells you an idea is already done, they are observing the form and reasoning about the fit. This is like watching someone eat a sandwich and concluding all sandwiches taste the same. It would be a hard sell at any deli.",
    },
    {
      type: "h2",
      text: "What's actually scarce",
    },
    {
      type: "p",
      text: "If the idea isn't scarce, what is?",
    },
    {
      type: "p",
      text: "A few things, in increasing order of how much they hurt to provide.",
    },
    {
      type: "p",
      text: "The first is the willingness to ship the unsexy eighty percent. Every product form has roughly four-fifths of its surface area that is just plumbing. Authentication flows. Password resets. Empty states. Loading skeletons. CSV export, because someone in finance will ask. Most projects die here, between the dopamine of the first prototype and the resignation of the seventeenth empty-state component. The willingness to grind through this is rare, and it is rare in a way that compounds. The people who finish the eighty percent get to learn what the next product needs. The people who don't are stuck on the first one forever.",
    },
    {
      type: "p",
      text: "The second is the taste to fix the remaining twenty. The last fifth of the work is what your users actually feel. The keyboard shortcut that exists. The font that doesn't fight your eyes. The error message that admits the mistake instead of blaming the network. This is not a function of effort. It's a function of having opinions about software and a stomach to enforce them. Most teams don't, because most teams are committees, and committees average out the good opinions and the bad ones until what's left is the shape of nobody.",
    },
    {
      type: "callout",
      text: "the idea was never the point. the idea is the cheapest input.",
    },
    {
      type: "p",
      text: "The third, the one nobody wants, is distribution patience. The willingness to spend two years telling the same five people about your product before any of them tell five more. This is what kills the most original ideas: not the idea itself, but the founder who can't tolerate the silence between launch and traction. They build the next thing. Then the next. They acquire a graveyard of original ideas, none of which got the eight quarters of distribution they each deserved.",
    },
    {
      type: "h2",
      text: "On copying without copying",
    },
    {
      type: "p",
      text: "If you accept that the idea isn't the work, you arrive at a useful permission slip: it's fine to copy. Or rather, it's fine to enter the form.",
    },
    {
      type: "p",
      text: "You are not stealing when you ship the forty-first project management tool. You are entering a form that happens to have forty other entrants, all of whom are doing it slightly wrong for someone. The someone you serve will not be the same someone Linear serves. They will not be the same someone Trello serves. They will be the someone for whom every existing tool is, somehow, just a little off. Too heavy. Too light. Too corporate. Too cute. Too expensive. Too cheap. Missing one specific thing that drives them to chew on a pen during standup.",
    },
    {
      type: "p",
      text: "That someone exists. Their existence is what creates room in a saturated market. Markets don't saturate. They fragment.",
    },
    {
      type: "p",
      text: "The thing you bring to the form is your taste, and the willingness to hold it through eight quarters of nobody noticing.",
    },
    {
      type: "h2",
      text: "Why I built saaspocalypse",
    },
    {
      type: "p",
      text: "I built saaspocalypse because I kept watching people in indie communities run into the wall of \"but Notion already exists\" and convince themselves they shouldn't try. The wall is real, in the sense that yes, Notion exists. It is also not the wall they thought it was. The actual wall is the eighty-percent grind and the distribution silence, and you don't get to discover that until you've started.",
    },
    {
      type: "p",
      text: "The scanner is not a permission slip. It will, sometimes, tell you a thing is genuinely a bad use of your weekend, usually because the moat is regulatory, or the product is a side effect of an integrations team you don't have. That's useful information. But the answer to \"could you build this?\" is, for most of the SaaS surface area, yes. The interesting question is what you'd do with the form once you were inside it.",
    },
    {
      type: "p",
      text: "Originality wasn't going to save you. It was never going to. The idea was the cheapest input.",
    },
    {
      type: "p",
      text: "If anything I've said here lands, the next thing you ship will be a knockoff with taste. Welcome to the club. The dues are paid in eighty percent of the work and two years of telling people about it.",
    },
  ],
};
