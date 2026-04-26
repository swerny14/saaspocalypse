export function ScoreBar({ score, width = 120 }: { score: number; width?: number }) {
  const segs = 10;
  const filled = Math.round((score / 100) * segs);
  return (
    <div className="flex items-center gap-2">
      <div
        className="flex gap-[2px] border-[1.5px] border-ink p-[2px] bg-paper"
        style={{ width }}
      >
        {Array.from({ length: segs }).map((_, i) => (
          <div
            key={i}
            className="flex-1 h-[10px]"
            style={{ background: i < filled ? "#0a0a0a" : "transparent" }}
          />
        ))}
      </div>
      <span className="font-mono font-bold text-xs min-w-[28px]">{score}</span>
    </div>
  );
}
