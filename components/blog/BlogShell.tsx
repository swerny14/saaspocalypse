type Props = {
  width: "index" | "article";
  children: React.ReactNode;
};

export function BlogShell({ width, children }: Props) {
  const max = width === "index" ? "max-w-[1200px]" : "max-w-[780px]";
  return (
    <main className="bg-bg min-h-screen">
      <div className="container py-9">
        <div className={`${max} mx-auto`}>{children}</div>
      </div>
    </main>
  );
}
