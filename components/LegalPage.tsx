import type { LegalBlock, LegalSection } from "@/lib/legal/types";

type Props = {
  title: string;
  effectiveDate: string;
  intro: string;
  sections: LegalSection[];
};

function Block({ block }: { block: LegalBlock }) {
  switch (block.kind) {
    case "p":
      return <p className="text-[15px] leading-[1.7] mb-4">{block.text}</p>;
    case "ul":
      return (
        <ul className="list-disc pl-6 text-[15px] leading-[1.7] mb-4 space-y-1.5">
          {block.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      );
    case "ol":
      return (
        <ol className="list-decimal pl-6 text-[15px] leading-[1.7] mb-4 space-y-1.5">
          {block.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ol>
      );
  }
}

export function LegalPage({ title, effectiveDate, intro, sections }: Props) {
  return (
    <main className="bg-bg min-h-screen py-16">
      <div className="container max-w-[820px]">
        <h1 className="font-display font-bold text-[clamp(40px,6vw,72px)] tracking-[-0.02em] leading-[1.05] mb-2">
          {title}
        </h1>
        <p className="font-mono text-[12px] uppercase tracking-[0.08em] text-muted mb-8">
          Last updated: {effectiveDate}
        </p>

        <div className="bru-sm bg-accent p-5 font-mono text-[14px] leading-[1.55]">
          {intro}
        </div>

        <article className="bru bg-paper p-8 md:p-12 mt-8">
          {sections.map((section, sIdx) => (
            <section key={section.heading}>
              <h2
                className={`font-display text-[22px] font-bold tracking-[-0.02em] mb-4 ${
                  sIdx === 0 ? "mt-0" : "mt-10"
                }`}
              >
                {section.heading}
              </h2>
              {section.blocks.map((block, i) => (
                <Block key={i} block={block} />
              ))}
            </section>
          ))}
        </article>

        <p className="font-mono text-[12px] text-muted mt-8 text-center">
          Questions? Email <span className="text-ink">support@saaspocalypse.dev</span>.
        </p>
      </div>
    </main>
  );
}
