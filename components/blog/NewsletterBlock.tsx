import { NEWSLETTER_COPY } from "@/lib/blog/content";
import { NewsletterForm } from "./NewsletterForm";

type Props = { compact?: boolean };

export function NewsletterBlock({ compact = false }: Props) {
  const margin = compact ? "mt-10" : "mt-14";
  const padding = compact
    ? "p-[28px_32px] max-[480px]:p-[24px_22px]"
    : "p-[40px_44px] max-[480px]:p-[28px_22px]";
  const grid = compact
    ? "grid-cols-[1fr_auto] max-[700px]:grid-cols-1"
    : "grid-cols-[1.2fr_1fr] max-[700px]:grid-cols-1";
  const headlineSize = compact ? "text-[28px]" : "text-[clamp(26px,3.4vw,38px)]";

  return (
    <section
      className={`${margin} ${padding} bru bg-coral text-ink grid ${grid} gap-7 items-center`}
    >
      <div>
        <div className="font-mono text-[11px] font-bold tracking-[0.2em] uppercase opacity-70 mb-2">
          {NEWSLETTER_COPY.eyebrow}
        </div>
        <div
          className={`font-display font-bold ${headlineSize} tracking-[-0.025em] leading-[1.1] text-balance`}
        >
          {NEWSLETTER_COPY.headline}
        </div>
        {!compact && (
          <p className="font-display text-[15px] leading-[1.55] opacity-80 max-w-[460px] mt-3 mb-0">
            {NEWSLETTER_COPY.body}
          </p>
        )}
      </div>
      <NewsletterForm />
    </section>
  );
}
