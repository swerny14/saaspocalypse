"use client";

import { useState } from "react";

export function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-t-2 border-ink py-5">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="bg-none border-none p-0 cursor-pointer w-full flex justify-between items-center text-left text-ink gap-4"
      >
        <span className="font-display text-[22px] font-semibold tracking-[-0.02em]">
          {q}
        </span>
        <span
          aria-hidden
          className={`font-display text-[28px] font-bold w-9 h-9 grid place-items-center border-2 border-ink shrink-0 leading-none ${
            open ? "bg-accent" : "bg-paper"
          }`}
        >
          {open ? "−" : "+"}
        </span>
      </button>
      {open && (
        <p className="font-mono text-base leading-[1.6] mt-3.5 mb-0 max-w-[700px]">
          {a}
        </p>
      )}
    </div>
  );
}
