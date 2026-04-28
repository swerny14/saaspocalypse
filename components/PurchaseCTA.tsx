"use client";

import { useState } from "react";
import { TERMS_VERSION } from "@/lib/legal/terms";
import { PRIVACY_VERSION } from "@/lib/legal/privacy";

type Props = {
  slug: string;
  score: number;
  priceCents: number;
  dontTierGuidesEnabled: boolean;
};

export function PurchaseCTA({
  slug,
  score,
  priceCents,
  dontTierGuidesEnabled,
}: Props) {
  const [open, setOpen] = useState(false);

  const isDontTier = score < 30;

  // Flag-off DON'T tier → keep the original disabled "sorry, we tried" affordance.
  if (isDontTier && !dontTierGuidesEnabled) {
    return (
      <button
        type="button"
        disabled
        className="font-display text-lg font-bold tracking-[-0.01em] bg-accent text-ink border-[2.5px] border-accent shadow-[5px_5px_0_0_var(--color-bg)] px-7 py-4 cursor-not-allowed whitespace-nowrap opacity-60 max-[720px]:justify-self-start"
        title="Not sold for DON'T-tier products"
      >
        → sorry, we tried
      </button>
    );
  }

  const label = isDontTier ? "→ get the MVP guide" : "→ get the build guide";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="font-display text-lg font-bold tracking-[-0.01em] bg-accent text-ink border-[2.5px] border-accent shadow-[5px_5px_0_0_var(--color-bg)] px-7 py-4 cursor-pointer whitespace-nowrap hover:shadow-[7px_7px_0_0_var(--color-bg)] transition-shadow max-[720px]:justify-self-start"
      >
        {label}
      </button>
      {open && (
        <PurchaseModal
          slug={slug}
          priceCents={priceCents}
          isDontTier={isDontTier}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function PurchaseModal({
  slug,
  priceCents,
  isDontTier,
  onClose,
}: {
  slug: string;
  priceCents: number;
  isDontTier: boolean;
  onClose: () => void;
}) {
  const [email, setEmail] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const priceDisplay =
    priceCents === 0
      ? "Free (dev)"
      : `$${(priceCents / 100).toFixed(2)}`;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !email.includes("@")) {
      setError("Enter a valid email.");
      return;
    }
    if (!agreed) {
      setError("Please agree to the Terms and Privacy Policy to continue.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/purchase", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          slug,
          email: email.trim().toLowerCase(),
          accepted: true,
          terms_version: TERMS_VERSION,
          privacy_version: PRIVACY_VERSION,
        }),
      });
      const data = (await res.json()) as { redirect?: string; error?: string };
      if (!res.ok || !data.redirect) {
        setError(data.error ?? `Purchase failed (${res.status})`);
        setBusy(false);
        return;
      }
      window.location.href = data.redirect;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Purchase failed");
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-ink/60 grid place-items-center p-4 text-ink"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="bg-paper border-[2.5px] border-ink shadow-[6px_6px_0_0_#0a0a0a] w-full max-w-[460px] p-7 text-ink"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="font-mono text-[11px] font-bold tracking-[0.15em] uppercase text-muted mb-2">
          one-time purchase · {priceDisplay}
        </div>
        <h2 className="font-display text-[28px] font-bold leading-[1.1] tracking-[-0.02em] m-0 mb-3">
          {isDontTier ? "Get your MVP guide." : "Get your build guide."}
        </h2>
        <p className="text-sm opacity-75 m-0 mb-5 leading-[1.5]">
          A step-by-step guide with ready-to-paste LLM prompts, stack specifics,
          and the pitfalls you&apos;ll hit. Magic link sent to your inbox —
          you keep it forever.
        </p>

        {isDontTier && (
          <div className="mb-5 px-3 py-2.5 border-2 border-dashed border-ink bg-sticky/30 font-mono text-[12px] leading-[1.5]">
            Heads up: this is a DON&apos;T-tier verdict. The guide is for an MVP
            starter, not a full clone. You&apos;ll ship something — just not
            the original.
          </div>
        )}

        <form onSubmit={submit} className="grid gap-3">
          <label className="font-mono text-[11px] font-bold tracking-[0.1em] uppercase text-muted">
            email
            <input
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@ship.it"
              className="mt-1.5 w-full border-2 border-ink bg-paper font-mono text-base px-3 py-2.5 outline-none text-ink"
            />
          </label>

          <label className="flex items-start gap-2.5 cursor-pointer font-mono text-[12px] leading-[1.5] text-ink">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              required
              className="mt-[3px] w-[15px] h-[15px] accent-ink shrink-0 cursor-pointer"
            />
            <span>
              I agree to the{" "}
              <a
                href="/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                Terms
              </a>{" "}
              and{" "}
              <a
                href="/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                Privacy Policy
              </a>
              .
            </span>
          </label>

          {error && (
            <div className="font-mono text-[13px] text-danger">▸ {error}</div>
          )}

          <div className="flex gap-3 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="font-mono text-[13px] font-bold uppercase tracking-[0.1em] bg-paper border-2 border-ink px-4 py-2.5 cursor-pointer"
            >
              cancel
            </button>
            <button
              type="submit"
              disabled={busy || !agreed}
              className="flex-1 font-display text-base font-bold tracking-[-0.01em] bg-accent text-ink border-2 border-ink px-4 py-2.5 cursor-pointer disabled:cursor-not-allowed disabled:opacity-70"
            >
              {busy ? "redirecting…" : "continue to checkout →"}
            </button>
          </div>
        </form>

        <div className="mt-5 pt-4 border-t border-dashed border-[#ccc] font-mono text-[11px] opacity-60 leading-[1.5]">
          Already bought it?{" "}
          <ResendLink slug={slug} />
        </div>
      </div>
    </div>
  );
}

function ResendLink({ slug }: { slug: string }) {
  const [state, setState] = useState<"idle" | "asking" | "sending" | "sent">(
    "idle",
  );
  const [email, setEmail] = useState("");

  if (state === "idle") {
    return (
      <button
        onClick={() => setState("asking")}
        className="underline text-ink bg-transparent border-none cursor-pointer p-0 font-mono text-[11px]"
      >
        resend the link
      </button>
    );
  }
  if (state === "sent") {
    return <span>✓ If that email is on file, we just sent the link.</span>;
  }
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!email.includes("@")) return;
        setState("sending");
        await fetch("/api/purchase/resend", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ slug, email: email.trim().toLowerCase() }),
        });
        setState("sent");
      }}
      className="inline-flex gap-2 items-center"
    >
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="your email"
        className="border border-ink bg-paper font-mono text-[11px] px-2 py-1 outline-none"
      />
      <button
        type="submit"
        disabled={state === "sending"}
        className="font-mono text-[11px] font-bold uppercase bg-ink text-accent px-2 py-1 border-none cursor-pointer"
      >
        {state === "sending" ? "…" : "send"}
      </button>
    </form>
  );
}
