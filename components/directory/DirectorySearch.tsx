"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

type Props = {
  initialQuery: string;
  initialSort: string;
  sortOptions: { value: string; label: string }[];
};

export function DirectorySearch({ initialQuery, initialSort, sortOptions }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(initialQuery);
  const [, startTransition] = useTransition();
  const [isNarrow, setIsNarrow] = useState(false);

  useEffect(() => {
    setValue(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 720px)");
    const update = () => setIsNarrow(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  function commit(next: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (next) params.set("q", next);
    else params.delete("q");
    params.delete("page");
    startTransition(() => {
      router.replace(`/directory?${params.toString()}`);
    });
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    commit(value);
  }

  function onSortChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(searchParams.toString());
    if (e.target.value) params.set("sort", e.target.value);
    else params.delete("sort");
    params.delete("page");
    startTransition(() => {
      router.replace(`/directory?${params.toString()}`);
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="grid grid-cols-[1fr_auto_auto] mb-8 border-[2.5px] border-ink shadow-[6px_6px_0_0_#0a0a0a] bg-paper max-[720px]:grid-cols-1"
    >
      <div className="flex items-center px-[22px] max-[720px]:px-4">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={
            isNarrow
              ? "search scans…"
              : "search scans — try 'notion', 'analytics', 'don't build'…"
          }
          aria-label="Search scans"
          className="flex-1 py-5 font-display text-[22px] font-medium tracking-[-0.01em] bg-transparent outline-none border-none text-ink placeholder:opacity-50 max-[720px]:py-3.5 max-[720px]:text-base"
        />
      </div>
      <label className="flex items-center px-[18px] border-l-[2.5px] border-ink font-mono text-[11px] font-bold tracking-[0.1em] uppercase gap-2 max-[720px]:border-l-0 max-[720px]:border-t-[2.5px] max-[720px]:px-4 max-[720px]:py-3 max-[720px]:text-[13px]">
        <span className="opacity-50">sort:</span>
        <select
          defaultValue={initialSort}
          onChange={onSortChange}
          aria-label="Sort scans"
          className="flex-1 font-mono text-[11px] font-bold tracking-[0.1em] uppercase bg-transparent border-none outline-none cursor-pointer pr-1 max-[720px]:text-[13px]"
        >
          {sortOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>
      <button
        type="submit"
        className="bg-ink text-accent font-display font-bold text-base px-7 py-5 tracking-[-0.01em] cursor-pointer hover:bg-accent hover:text-ink transition-colors max-[720px]:py-4"
      >
        Search →
      </button>
    </form>
  );
}
