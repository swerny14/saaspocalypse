import Image from "next/image";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="py-10 bg-bg border-t-[2.5px] border-ink font-mono text-[13px]">
      <div className="container flex justify-between items-center flex-wrap gap-5">
        <div className="flex items-center gap-3">
          <Image
            src="/images/logo.png"
            alt="saaspocalypse logo"
            width={28}
            height={28}
            className="rounded-full -rotate-3 select-none"
          />
          <div>
            <div className="font-display font-bold text-base">saaspocalypse</div>
            <div className="opacity-60 mt-0.5 text-[12px]">
              © 2026 · made by someone who should&apos;ve been sleeping
            </div>
          </div>
        </div>
        <nav className="flex items-center gap-5" aria-label="Footer">
          <Link
            href="/directory"
            className="hover:underline underline-offset-4"
          >
            Directory
          </Link>
          <Link
            href="/blog"
            className="hover:underline underline-offset-4"
          >
            Blog
          </Link>
          <Link
            href="/terms"
            className="hover:underline underline-offset-4"
          >
            Terms
          </Link>
          <Link
            href="/privacy"
            className="hover:underline underline-offset-4"
          >
            Privacy
          </Link>
        </nav>
      </div>
    </footer>
  );
}
