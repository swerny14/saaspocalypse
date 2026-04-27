"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

const LINKS = [
  { href: "/directory", label: "Directory" },
  { href: "/blog", label: "Blog" },
  { href: "/#how", label: "How it works" },
  { href: "/#faq", label: "FAQ" },
];

export function Nav() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <nav className="sticky top-0 z-20 bg-bg border-b-[2.5px] border-ink">
      <div className="container flex items-center justify-between gap-3 py-[18px]">
        <Link
          href="/"
          onClick={() => setOpen(false)}
          className="flex items-center gap-3 no-underline text-ink min-w-0"
        >
          <Image
            src="/images/logo.png"
            alt="saaspocalypse logo"
            width={34}
            height={34}
            priority
            className="rounded-full -rotate-3 select-none shrink-0 w-[28px] h-[28px] min-[700px]:w-[34px] min-[700px]:h-[34px]"
          />
          <span className="font-display font-bold text-[18px] min-[700px]:text-[22px] tracking-[-0.02em] truncate">
            saaspocalypse
          </span>
          <span className="hidden sm:inline select-none text-[11px] bg-ink text-accent px-2 py-0.5 font-mono font-bold uppercase tracking-[0.08em]">
            beta, probably
          </span>
        </Link>

        <div className="flex items-center gap-3 min-[700px]:gap-6 font-mono text-sm shrink-0">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="hidden min-[700px]:inline text-ink no-underline"
            >
              {l.label}
            </Link>
          ))}
          <Link
            href="/#scanner"
            onClick={() => setOpen(false)}
            className="bru-xs no-underline bg-accent text-ink px-3 py-2 min-[700px]:px-4 font-display font-semibold text-sm whitespace-nowrap"
          >
            <span className="min-[700px]:hidden">Scan ↓</span>
            <span className="hidden min-[700px]:inline">Scan a URL ↓</span>
          </Link>
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="mobile-nav-panel"
            onClick={() => setOpen((v) => !v)}
            className="min-[700px]:hidden bru-xs bg-paper text-ink px-2 py-[11px] flex items-center justify-center"
          >
            <span aria-hidden="true" className="block w-5 h-[14px] relative">
              <span
                className={`absolute left-0 right-0 h-[2px] bg-ink transition-transform ${
                  open ? "top-[6px] rotate-45" : "top-0"
                }`}
              />
              <span
                className={`absolute left-0 right-0 h-[2px] bg-ink top-[6px] transition-opacity ${
                  open ? "opacity-0" : "opacity-100"
                }`}
              />
              <span
                className={`absolute left-0 right-0 h-[2px] bg-ink transition-transform ${
                  open ? "top-[6px] -rotate-45" : "top-[12px]"
                }`}
              />
            </span>
          </button>
        </div>
      </div>

      {open && (
        <div
          id="mobile-nav-panel"
          className="min-[700px]:hidden border-t-[2.5px] border-ink bg-bg"
        >
          <ul className="container flex flex-col py-2 font-mono text-base">
            {LINKS.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="block py-3 text-ink no-underline border-b border-ink/15 last:border-b-0"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </nav>
  );
}
