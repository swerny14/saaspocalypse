import { FOOTER_EASTER } from "@/lib/content";

export function Footer() {
  return (
    <footer className="py-10 bg-bg border-t-[2.5px] border-ink font-mono text-[13px]">
      <div className="container flex justify-between flex-wrap gap-5">
        <div>
          <div className="font-display font-bold text-base">saaspocalypse</div>
          <div className="opacity-60 mt-1">
            © 2026 · made by someone who should&apos;ve been sleeping
          </div>
        </div>
        <div className="flex gap-6 opacity-70 flex-wrap">
          {FOOTER_EASTER.map((t, i) => (
            <span key={i}>{t}</span>
          ))}
        </div>
      </div>
    </footer>
  );
}
