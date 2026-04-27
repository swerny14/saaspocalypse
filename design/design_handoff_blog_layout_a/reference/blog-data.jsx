// blog-data.jsx — Saaspocalypse blog content

const BLOG_POSTS = [
  {
    id: 'p1',
    title: "The 'just one more feature' is calling from inside the house.",
    excerpt: "I've been adding features to my todo app for 14 months. I have 12 users. Three of them are me. Here's why I can't stop and you probably can't either.",
    date: 'Apr 23, 2026',
    readTime: '7 min',
    tags: ['confession', 'scope creep'],
    featured: true,
    category: 'essays',
    author: 'mara',
  },
  {
    id: 'p2',
    title: "Stop building. Your launch list has 4 people on it.",
    excerpt: "A loving roast of my own pre-launch waitlist, and the spreadsheet that finally made me ship.",
    date: 'Apr 19, 2026',
    readTime: '5 min',
    tags: ['launching', 'distribution'],
    category: 'essays',
    author: 'mara',
  },
  {
    id: 'p3',
    title: "I built a Notion clone in 14 hours. Here's the part that took 13 of them.",
    excerpt: "Spoiler: not the editor. Not the database. Drag-and-drop on a nested tree, alone, took longer than the rest of the app combined.",
    date: 'Apr 14, 2026',
    readTime: '11 min',
    tags: ['build log', 'technical'],
    category: 'build-log',
    author: 'jules',
  },
  {
    id: 'p4',
    title: "Your SaaS doesn't have a marketing problem. It has a Wednesday problem.",
    excerpt: "On the slow erosion of consistency, and why every indie product I admire was the dumbest version of itself for two years.",
    date: 'Apr 09, 2026',
    readTime: '6 min',
    tags: ['marketing', 'consistency'],
    category: 'essays',
    author: 'mara',
  },
  {
    id: 'p5',
    title: "An ode to the 'view-source' generation.",
    excerpt: "A love letter to the kids who grew up right-clicking GeoCities. A worry letter to the ones who grew up scrolling TikTok.",
    date: 'Apr 02, 2026',
    readTime: '4 min',
    tags: ['nostalgia', 'craft'],
    category: 'essays',
    author: 'mara',
  },
  {
    id: 'p6',
    title: "Indie pricing is a cope. Here's what I'd actually charge.",
    excerpt: "Why $9/mo is psychic damage to you AND your customer, and what 4 indie hackers I respect actually charge.",
    date: 'Mar 28, 2026',
    readTime: '8 min',
    tags: ['pricing', 'business'],
    category: 'opinion',
    author: 'jules',
  },
  {
    id: 'p7',
    title: "I asked my users for feedback. They asked me to leave.",
    excerpt: "On the gap between what users say, what users want, and what users will pay for. (These are three different things.)",
    date: 'Mar 22, 2026',
    readTime: '5 min',
    tags: ['users', 'research'],
    category: 'essays',
    author: 'mara',
  },
  {
    id: 'p8',
    title: "The case for shipping at 60% and apologizing later.",
    excerpt: "Apology emails convert better than feature emails. Don't ask me how I know.",
    date: 'Mar 15, 2026',
    readTime: '4 min',
    tags: ['shipping', 'velocity'],
    category: 'opinion',
    author: 'jules',
  },
  {
    id: 'p9',
    title: "Why every solo founder reinvents customer support at month 4.",
    excerpt: "First it's email. Then a help doc. Then Notion. Then a Discord. Then crying. Then Intercom. The cycle is undefeated.",
    date: 'Mar 08, 2026',
    readTime: '6 min',
    tags: ['support', 'tools'],
    category: 'opinion',
    author: 'mara',
  },
  {
    id: 'p10',
    title: "You don't have a competitor. You have a Tuesday.",
    excerpt: "On the real reason your users churn (it isn't Linear, Notion, or that Y Combinator startup with $4M).",
    date: 'Mar 01, 2026',
    readTime: '5 min',
    tags: ['competition', 'churn'],
    category: 'essays',
    author: 'jules',
  },
];

// Sample article body — for the post detail page
const SAMPLE_ARTICLE = {
  ...BLOG_POSTS[0],
  body: [
    { type: 'p', text: "I've been adding features to my todo app for 14 months. I have 12 users. Three of them are me. The other nine are friends I tricked into signing up at a wedding." },
    { type: 'p', text: "Last Tuesday I added a third-level priority indicator. It's a tiny chevron. It rotates 30 degrees when you hover. I spent six hours on the rotation curve." },
    { type: 'p', text: "Nobody asked for it. Nobody will use it. I made it because the alternative was opening Twitter and posting about it, which I am, in fact, also doing right now." },

    { type: 'h2', text: "The feature is calling from inside the house" },

    { type: 'p', text: "There's a particular kind of feature you build at month 11 of a side project. It looks like progress. It feels like progress. It is not progress." },
    { type: 'p', text: "It's the chevron. It's the dark mode toggle that took a weekend. It's the keyboard shortcut for an action your three users do once a month. It's the thing you build because you're terrified to do the actual job, which is" },

    { type: 'callout', text: "telling another human being your product exists." },

    { type: 'p', text: "I'd rather rewrite my markdown parser than send another newsletter. I'd rather migrate to a new database than ask a friend if they'd try the new feature. I'd rather refactor my types than DM someone on Twitter and say, hi, this might be useful for you." },
    { type: 'p', text: "And so I rewrite the markdown parser. And so I migrate the database. And so I refactor the types. The product gets technically more impressive and emotionally more invisible, week after week, and I get to feel like I worked." },

    { type: 'h2', text: "How I'm trying to stop" },

    { type: 'p', text: "I made a rule, mostly for myself, partly for whoever's reading this, and I'll let you know in six months if it worked. The rule is: every feature I add must be paired with one act of distribution. One DM. One reply on a forum. One newsletter. One demo to a stranger." },
    { type: 'p', text: "If I won't do the distribution, I don't get to do the feature. If I want to add the chevron, I have to email five people first. The chevron is the reward, not the work." },
    { type: 'p', text: "This is, I am told, basic. This is what every business book tells you. I have read those business books. I read them while not shipping." },

    { type: 'h2', text: "The verdict" },

    { type: 'p', text: "If you're reading this and you've been building your thing for a year and you have nine users, three of which are you: hi. I see you. The chevron is beautiful. Send the email anyway." },
    { type: 'p', text: "I'll go first." },
  ],
};

window.BLOG_POSTS = BLOG_POSTS;
window.SAMPLE_ARTICLE = SAMPLE_ARTICLE;
