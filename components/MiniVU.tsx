"use client";

import { useEffect, useState } from "react";

interface Props {
  active?: boolean;
  bpm?: number;
  bars?: number;
}

export default function MiniVU({ active = true, bpm = 120, bars = 14 }: Props) {
  const [levels, setLevels] = useState<number[]>(
    Array.from({ length: bars }, () => 10)
  );

  useEffect(() => {
    if (!active) {
      setLevels(Array.from({ length: bars }, () => 6));
      return;
    }

    const intervalMs = Math.max(100, 60000 / bpm);

    const interval = setInterval(() => {
      setLevels((prev) =>
        prev.map((_, i) => {
          const isBeatBar = i % 3 === 0;
          return isBeatBar ? 60 + Math.random() * 40 : 20 + Math.random() * 30;
        })
      );
    }, intervalMs);

    return () => clearInterval(interval);
  }, [active, bpm, bars]);

  return (
    <div className="flex items-end gap-[3px] h-10">
      {levels.map((h, i) => (
        <div
          key={i}
          className="w-[6px] rounded-sm transition-all duration-150"
          style={{
            height: `${h}%`,
            background:
              "linear-gradient(to top, rgb(var(--accent-strong)), rgb(var(--accent)))",

            opacity: active ? 1 : 0.4,
          }}
        />
      ))}
    </div>
  );
}
