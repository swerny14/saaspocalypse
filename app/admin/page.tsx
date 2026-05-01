import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";

type Surface = {
  href: string;
  title: string;
  blurb: string;
  posture: string;
};

const SURFACES: Surface[] = [
  {
    href: "/admin/score-audit",
    title: "score workbench",
    blurb:
      "Find suspect wedge scores, inspect exactly what fired, add patterns, tune weights, recompute, and mark reports verified.",
    posture: "calibration",
  },
  {
    href: "/admin/unknowns",
    title: "unknowns",
    blurb:
      "Triage stack-component terms the harvester saw but could not map to a canonical slug. Alias to existing components, promote to new components, or ignore.",
    posture: "harvester",
  },
  {
    href: "/admin/similarity-gaps",
    title: "similarity gaps",
    blurb:
      "Find pairs of reports that should cluster as similar but do not, usually because the taxonomy is missing a descriptor capability.",
    posture: "similarity",
  },
];

export default async function AdminIndex() {
  if (!(await isAdmin())) redirect("/admin/login");

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="font-display font-bold text-[28px] tracking-[-0.02em] lowercase mb-1">
          curation surfaces.
        </h1>
        <p className="font-mono text-[12px] tracking-[0.05em] opacity-65">
          deterministic engine, human-curated taxonomy. pick a queue.
        </p>
      </div>

      <div className="grid gap-3">
        {SURFACES.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="bru border-[2.5px] bg-paper px-5 py-4 no-underline text-ink hover:translate-y-[-2px] hover:shadow-[3px_3px_0_0_#0a0a0a] transition-transform"
          >
            <div className="flex items-baseline justify-between gap-3 mb-1">
              <span className="font-display font-bold text-[18px] tracking-[-0.02em] lowercase">
                {s.title}
              </span>
              <span className="font-mono text-[10px] tracking-[0.15em] uppercase opacity-55">
                {s.posture} -&gt;
              </span>
            </div>
            <p className="font-display text-[13px] opacity-70 leading-[1.45] [text-wrap:pretty]">
              {s.blurb}
            </p>
          </Link>
        ))}
      </div>

      <p className="mt-8 font-mono text-[10px] tracking-[0.12em] uppercase opacity-50">
        rotate ADMIN_SECRET to invalidate all sessions.
      </p>
    </div>
  );
}
