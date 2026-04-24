type Props = {
  eyebrow: string;
  title: string;
  sub?: string;
  dark?: boolean;
};

export function SectionHead({ eyebrow, title, sub, dark }: Props) {
  return (
    <div className="max-w-[820px]">
      <div
        className={`font-mono text-[13px] font-bold tracking-[0.15em] uppercase ${
          dark ? "text-accent" : "text-muted"
        }`}
      >
        {eyebrow}
      </div>
      <h2 className="font-display font-bold mt-3 mb-4 text-[clamp(40px,5.5vw,68px)] leading-none tracking-[-0.03em] text-balance">
        {title}
      </h2>
      {sub && (
        <p className="font-mono text-lg leading-normal m-0 opacity-85 max-w-[640px]">
          {sub}
        </p>
      )}
    </div>
  );
}
