import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "admin · saaspocalypse",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b-2 border-ink bg-bg px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="font-display text-sm uppercase tracking-[0.15em] text-ink">
            saaspocalypse · admin
          </div>
          <Link href="/" className="text-xs text-muted hover:text-ink">
            ← back to site
          </Link>
        </div>
      </header>
      <main className="px-6 py-8">{children}</main>
    </div>
  );
}
