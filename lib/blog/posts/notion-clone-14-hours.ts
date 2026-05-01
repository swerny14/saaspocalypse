import type { Post } from "../schema";

export const post: Post = {
  slug: "notion-clone-14-hours",
  title: "I built a Notion clone in 14 hours. The editor wasn't the hard part.",
  excerpt:
    "Drag-and-drop on a nested tree took longer than the editor, the database, and the auth flow combined. A note on the gap between perceived and actual difficulty.",
  date: "2026-04-14",
  read_time: "5 min",
  tags: ["build-log", "technical"],
  category: "build-log",
  author: "saaspocalypse",
  body: [
    {
      type: "p",
      text: "I built a Notion clone in 14 hours, on a Saturday and most of the Sunday after, and the part that took the longest was not the part I'd expected. It wasn't the editor. It wasn't the database. It wasn't auth. It was drag-and-drop on a nested tree, and I'd budgeted forty-five minutes for it.",
    },
    {
      type: "p",
      text: "I want to write down what I learned, because the gap between what I thought would be hard and what actually was is the most interesting thing the project produced.",
    },
    {
      type: "h2",
      text: "What I expected to be hard",
    },
    {
      type: "p",
      text: "The editor. Notion is, on the surface, a rich-text editor with a few opinions on top: blocks, slash commands, embeds, a database view. I assumed the editor would be most of the work. This is what people who haven't built editors assume. The first time you build one, you discover that the boring problems (selection, IME composition, undo stacks, paste handling) are the entire shape of the work, and you assume those are why the timeline is going to slip.",
    },
    {
      type: "p",
      text: "It turned out not to be. The editor took maybe ninety minutes, including a small detour into figuring out which block-shaped library to lean on. There are at least four mature open-source editors that solve eighty percent of the problem. I picked one, wired it to a basic block schema, and moved on. The editor problem has been ground down into libraries by ten years of people who needed the same thing I did.",
    },
    {
      type: "p",
      text: "I expected the database view to take three or four hours. It took maybe two. It is, structurally, a sortable filterable table, and there are a hundred of those. The database part of Notion is special because of the integrations between table cells and document blocks, but the surface I was building didn't need that yet.",
    },
    {
      type: "p",
      text: "By hour three I had a working note-taking app with a block-based editor, a database view, and authentication. I felt great. I started on the sidebar.",
    },
    {
      type: "h2",
      text: "What was actually hard",
    },
    {
      type: "p",
      text: "The sidebar in Notion is a nested tree of pages. You can drag a page to reorder it. You can drag a page onto another page to nest it. You can drag a deeply-nested page out to the top level. You can drop a page above, below, or inside another page, and the visual feedback has to communicate which of those three you're about to do. The drop targets overlap in physical space. The cursor is a single point. The intent is three different things.",
    },
    {
      type: "p",
      text: "I budgeted forty-five minutes. I am not joking when I say it took the next eleven hours.",
    },
    {
      type: "p",
      text: "The first version of the drag-and-drop worked for a flat list. This took ten minutes. The second version worked for one level of nesting, except that the drop targets at the boundary between \"below this item\" and \"into this item\" overlapped, and the wrong one fired about thirty percent of the time. This took two hours of careful hitbox work to make the visual indicator match the actual drop zone, and another two hours to make it work when the user dragged slowly versus quickly, because the hover state behaves differently.",
    },
    {
      type: "p",
      text: "The third version handled arbitrary nesting depth. This is where the wheels came off. The state of \"what am I currently hovering over\" stops being a single value when you have nested trees. You're hovering over the leaf, but you might be intending to drop into the leaf's parent, or its grandparent, depending on how far left you've moved your cursor. The pattern that ended up working was tracking depth as a separate dimension and inferring it from horizontal mouse position, with a tunable threshold per indent level. That took the rest of the afternoon.",
    },
    {
      type: "p",
      text: "Then the bugs started. Dragging a page onto its own descendant created a loop, which was funny exactly once. Dragging a page during an in-progress save desynced the tree from the database. Dragging on touch devices required entirely different gesture handling. Live re-rendering during the drag made the drop targets shift under the cursor, which made the user feel like the app was moving the goalposts in real time.",
    },
    {
      type: "p",
      text: "By hour fourteen I had something that felt acceptable. It was not, by any stretch, finished.",
    },
    {
      type: "callout",
      text: "the difficulty of a feature is uncorrelated with how it looks on a marketing page.",
    },
    {
      type: "h2",
      text: "Why drag-and-drop on trees is uniquely difficult",
    },
    {
      type: "p",
      text: "Most of the things that make rich-text editing hard have been solved by libraries because rich-text editing is a famous, well-known problem. Drag-and-drop on a flat list is also well-supported. There are libraries for that.",
    },
    {
      type: "p",
      text: "Drag-and-drop on a recursive tree is in a strange middle position. It's not exotic enough to feel like a research problem, so nobody packages it. It's not simple enough to write in an afternoon, so everyone who needs it underestimates it. The result is that every product team that builds it builds it from scratch, hits the same set of physics-shaped bugs, and ends up with a working solution that nobody writes a blog post about because by the time they're done they're sick of the problem.",
    },
    {
      type: "p",
      text: "The reason it's hard isn't the code. It's that the user's intent is high-dimensional and the cursor is one-dimensional. You have to infer do they mean before, after, or inside, and at what indent depth, from a moving point on a screen, in real time, while also rendering the result so they can adjust. Every part of that sentence is a user-experience question masquerading as an engineering one.",
    },
    {
      type: "h2",
      text: "What the build taught me",
    },
    {
      type: "p",
      text: "The takeaway is not that drag-and-drop is hard. Many things are hard. The takeaway is that the difficulty of a feature, as estimated from the outside, is almost completely uncorrelated with the difficulty of building it.",
    },
    {
      type: "p",
      text: "The features that look impressive on a marketing page have usually been ground down by decades of prior art. The features that look trivial (\"you can drag pages around in the sidebar\") are often where all the actual work is. Cloning a product by reading its marketing site is a strategy that consistently underestimates the items below the fold and overestimates the items above it.",
    },
    {
      type: "p",
      text: "I built saaspocalypse partly as a reaction to this. The scanner doesn't just count features; it tries to figure out which ones are unloved-but-critical and which ones are loud-but-cheap. It is mostly right. It is sometimes spectacularly wrong, in ways that have made me rewrite the system prompt three times. The model, like me, will stare at a sidebar and assume it's free.",
    },
    {
      type: "p",
      text: "The right way to find the wedge on a product is to use it for two months first and notice which parts you stopped thinking about. Those are the parts the marketing page can't tell you about. Sometimes that's the moat. Sometimes that's the door.",
    },
    {
      type: "p",
      text: "The sidebar is not free.",
    },
  ],
};
