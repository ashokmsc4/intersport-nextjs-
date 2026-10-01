"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronIcon } from "@/components/icons";

/**
 * Horizontal scroller with previous/next buttons on wider screens (swipe on touch).
 * The buttons hide when everything fits and disable at either end.
 */
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
  const [edges, setEdges] = useState({ start: true, end: true });

  useEffect(() => {
    const el = list.current;
    if (!el) return;
    const update = () => {
      // scrollLeft is 0 at the start and negative towards the end in RTL.
      const offset = Math.abs(el.scrollLeft);
      const max = el.scrollWidth - el.clientWidth;
      setEdges({ start: offset <= 1, end: offset >= max - 1 });
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, []);
  const fits = edges.start && edges.end;
  const scroll = (forward: boolean) => {
    const el = list.current;
    if (!el) return;
    // scrollLeft runs negative in RTL, so flip the step there.
    const rtl = getComputedStyle(el).direction === "rtl";
    const step = el.clientWidth * 0.8 * (forward ? 1 : -1) * (rtl ? -1 : 1);
    el.scrollBy({ left: step, behavior: "smooth" });
  };
  const button =
    "absolute top-[35%] z-10 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-900 shadow-md transition hover:border-brand hover:text-brand disabled:pointer-events-none disabled:opacity-0 md:flex";

  return (
    <div className="relative">
      <ul
        ref={list}
        className={`-mx-4 flex snap-x gap-4 overflow-x-auto scroll-px-4 px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${className}`}
      >
        {children}
      </ul>
      {!fits && (
        <>
          <button type="button" onClick={() => scroll(false)} disabled={edges.start} aria-label={labels.previous} className={`${button} -start-3`}>
            <span className="rotate-180 rtl:rotate-0">
              <ChevronIcon />
            </span>
          </button>
          <button type="button" onClick={() => scroll(true)} disabled={edges.end} aria-label={labels.next} className={`${button} -end-3`}>
            <span className="rtl:rotate-180">
              <ChevronIcon />
            </span>
          </button>
        </>
      )}
    </div>
  );
}
