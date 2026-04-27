"use client";

import { useState, type FormEvent } from "react";
import { NEWSLETTER_COPY } from "@/lib/blog/content";

type Status = "idle" | "submitting" | "success" | "error";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "submitting") return;
    const trimmed = email.trim();
    if (!EMAIL_RE.test(trimmed)) {
      setStatus("error");
      setMessage(NEWSLETTER_COPY.error_invalid);
      return;
    }
    setStatus("submitting");
    setMessage(null);
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      if (!res.ok) {
        setStatus("error");
        setMessage(NEWSLETTER_COPY.error_generic);
        return;
      }
      setStatus("success");
      setMessage(null);
    } catch {
      setStatus("error");
      setMessage(NEWSLETTER_COPY.error_generic);
    }
  }

  if (status === "success") {
    return (
      <div className="border-[2.5px] border-ink bg-paper flex items-center px-4 py-[14px] font-mono text-sm">
        {NEWSLETTER_COPY.success}
      </div>
    );
  }

  return (
    <div>
      <form
        onSubmit={onSubmit}
        className="border-[2.5px] border-ink bg-paper flex"
      >
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          aria-label="Email address"
          placeholder={NEWSLETTER_COPY.placeholder}
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (status === "error") {
              setStatus("idle");
              setMessage(null);
            }
          }}
          className="flex-1 min-w-0 px-4 py-[14px] font-mono text-sm bg-transparent border-0 outline-none text-ink placeholder:opacity-50"
        />
        <button
          type="submit"
          disabled={status === "submitting"}
          className="font-display font-bold text-sm bg-accent text-ink border-l-[2.5px] border-ink px-[18px] tracking-[-0.01em] whitespace-nowrap disabled:opacity-60"
        >
          {status === "submitting" ? "..." : NEWSLETTER_COPY.cta}
        </button>
      </form>
      {message && (
        <div className="font-mono text-[11px] mt-2 text-ink/80">{message}</div>
      )}
    </div>
  );
}
