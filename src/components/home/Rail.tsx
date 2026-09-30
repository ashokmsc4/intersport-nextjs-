"use client";

import { useRef } from "react";
import { ChevronIcon } from "@/components/icons";

/** Horizontal scroller with previous/next buttons on wider screens (swipe on touch). */
export function Rail({
  children,
  labels,
  className = "",
}: {
  children: React.ReactNode;
  labels: { previous: string; next: string };
  className?: string;
}) {
  const list = useRef<HTMLUListElement>(null);
  const scroll = (forward: boolean) => {
    const el = list.current;
    if (!el) return;
    // scrollLeft runs negative in RTL, so flip the step there.
    const rtl = getComputedStyle(el).direction === "rtl";
    const step = el.clientWidth * 0.8 * (forward ? 1 : -1) * (rtl ? -1 : 1);
    el.scrollBy({ left: step, behavior: "smooth" });
  };
  const button =
    "absolute top-[35%] z-10 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-900 shadow-md transition hover:border-brand hover:text-brand md:flex";

  return (
    <div className="relative">
      <ul
        ref={list}
        className={`-mx-4 flex snap-x gap-4 overflow-x-auto scroll-px-4 px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${className}`}
      >
        {children}
      </ul>
      <button type="button" onClick={() => scroll(false)} aria-label={labels.previous} className={`${button} -start-3`}>
        <span className="rotate-180 rtl:rotate-0">
          <ChevronIcon />
        </span>
      </button>
      <button type="button" onClick={() => scroll(true)} aria-label={labels.next} className={`${button} -end-3`}>
        <span className="rtl:rotate-180">
          <ChevronIcon />
        </span>
      </button>
    </div>
  );
}
