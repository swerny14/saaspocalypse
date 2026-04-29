import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ error?: string; next?: string }> };

export default async function AdminLogin({ searchParams }: Props) {
  if (await isAdmin()) redirect("/admin/unknowns");
  const { error, next } = await searchParams;
  return (
    <div className="mx-auto max-w-md">
      <h1 className="font-display text-2xl text-ink">Admin sign-in</h1>
      <p className="mt-1 text-sm text-muted">
        Enter the admin secret to access the curation tools.
      </p>
      {error === "no_secret_configured" ? (
        <p className="mt-3 rounded border-2 border-danger bg-paper-alt p-3 text-xs text-ink">
          ADMIN_SECRET is not set on this deployment. Configure it in environment
          variables before signing in.
        </p>
      ) : null}
      {error === "bad_secret" ? (
        <p className="mt-3 rounded border-2 border-danger bg-paper-alt p-3 text-xs text-ink">
          That secret didn&apos;t match.
        </p>
      ) : null}
      <form
        action="/api/admin/login"
        method="POST"
        className="mt-6 flex flex-col gap-3"
      >
        {next ? <input type="hidden" name="next" value={next} /> : null}
        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-[0.15em] text-muted">secret</span>
          <input
            name="secret"
            type="password"
            autoComplete="current-password"
            required
            className="rounded border-2 border-ink bg-paper px-3 py-2 font-mono text-sm text-ink focus:outline-none"
          />
        </label>
        <button
          type="submit"
          className="bru self-start bg-accent px-4 py-2 font-display text-sm text-ink"
        >
          Sign in →
        </button>
      </form>
    </div>
  );
}
