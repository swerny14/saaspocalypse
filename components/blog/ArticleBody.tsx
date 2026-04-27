import type { BlogBlock } from "@/lib/blog/schema";

type Props = { blocks: BlogBlock[] };

export function ArticleBody({ blocks }: Props) {
  return (
    <div>
      {blocks.map((block, i) => {
        switch (block.type) {
          case "p":
            return (
              <p
                key={i}
                className="font-display text-[18px] leading-[1.65] text-pretty mt-0 mb-[18px]"
              >
                {block.text}
              </p>
            );
          case "h2":
            return (
              <h2
                key={i}
                className="font-display font-bold text-[clamp(24px,4vw,30px)] tracking-[-0.02em] leading-[1.15] mt-10 mb-3.5"
              >
                {block.text}
              </h2>
            );
          case "callout":
            return (
              <blockquote
                key={i}
                className="bru bg-accent p-[20px_24px] my-6 m-0 font-display font-semibold italic text-[clamp(20px,3vw,24px)] leading-[1.3] text-balance"
              >
                {`“${block.text}”`}
              </blockquote>
            );
        }
      })}
    </div>
  );
}
