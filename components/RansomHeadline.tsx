type Props = { text: string };

const CHIP_STYLES = [
  "bg-paper text-ink rotate-[-2deg]",
  "bg-accent text-ink rotate-[1.5deg]",
  "bg-sticky text-ink rotate-[-1deg]",
  "bg-ink text-accent rotate-[2.2deg]",
];

const CHIP_BASE =
  "inline-block origin-center border-[2.5px] border-ink shadow-[5px_5px_0_0_#0a0a0a] px-[0.14em] py-[0.02em]";

export function RansomHeadline({ text }: Props) {
  const words = text.split(/\s+/).filter(Boolean);
  return (
    <h1 className="font-display font-bold m-0 text-[clamp(48px,7.5vw,104px)] leading-[1.1] tracking-[-0.02em] flex flex-wrap gap-y-[0.18em] gap-x-[0.25em]">
      {words.map((w, i) => (
        <span key={i} className={`${CHIP_BASE} ${CHIP_STYLES[i % 4]}`}>
          {w}
        </span>
      ))}
    </h1>
  );
}
