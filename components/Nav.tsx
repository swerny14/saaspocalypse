import Image from "next/image";
import Link from "next/link";

export function Nav() {
  return (
    <nav className="sticky top-0 z-10 bg-bg border-b-[2.5px] border-ink">
      <div className="container flex items-center justify-between py-[18px]">
        <Link
          href="/"
          className="flex items-center gap-3 no-underline text-ink"
        >
          <Image
            src="/images/logo.png"
            alt="saaspocalypse logo"
            width={34}
            height={34}
            priority
            className="rounded-full -rotate-3 select-none"
          />
          <span className="font-display font-bold text-[22px] tracking-[-0.02em]">
            saaspocalypse
          </span>
          <span className="select-none text-[11px] bg-ink text-accent px-2 py-0.5 font-mono font-bold uppercase tracking-[0.08em]">
            beta, probably
          </span>
        </Link>
        <div className="flex items-center gap-6 font-mono text-sm">
          <Link href="/#examples" className="hidden sm:inline text-ink no-underline">
            Examples
          </Link>
          <Link href="/#how" className="hidden sm:inline text-ink no-underline">
            How it works
          </Link>
          <Link href="/#faq" className="hidden sm:inline text-ink no-underline">
            FAQ
          </Link>
          <Link
            href="/#scanner"
            className="bru-xs no-underline bg-accent text-ink px-4 py-2 font-display font-semibold text-sm"
          >
            Scan a URL ↓
          </Link>
        </div>
      </div>
    </nav>
  );
}
