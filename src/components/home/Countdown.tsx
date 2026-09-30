"use client";

import { useEffect, useState } from "react";

/** Days / hours / minutes / seconds to `end`, ticking each second (blank until mounted). */
export function Countdown({
  end,
  labels,
}: {
  end: number;
  labels: { days: string; hours: string; minutes: string; seconds: string };
}) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, []);

  const left = Math.max(0, end - (now ?? end));
  const parts = [
    [Math.floor(left / 86_400_000), labels.days],
    [Math.floor(left / 3_600_000) % 24, labels.hours],
    [Math.floor(left / 60_000) % 60, labels.minutes],
    [Math.floor(left / 1000) % 60, labels.seconds],
  ] as const;

  return (
    <div dir="ltr" className="flex gap-2 sm:gap-3" role="timer" aria-live="off">
      {parts.map(([value, label]) => (
        <div
          key={label}
          className="flex min-w-14 flex-col items-center rounded-lg bg-white/15 px-2 py-2 backdrop-blur sm:min-w-16"
        >
          <span className="text-2xl font-bold tabular-nums sm:text-3xl">
            {now === null ? "--" : String(value).padStart(2, "0")}
          </span>
          <span className="text-[10px] font-medium uppercase tracking-wider opacity-80">{label}</span>
        </div>
      ))}
    </div>
  );
}
