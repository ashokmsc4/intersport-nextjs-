"use client";

import { Children, useCallback, useEffect, useRef, useState } from "react";
import { ChevronIcon } from "@/components/icons";

const AUTOPLAY_MS = 5500;

/**
 * Hero slider on a scroll-snap track: swipeable on touch, arrows and dots on
 * top, autoplay that pauses on hover/focus and is off for reduced motion.
 */
export function Carousel({
  children,
  labels,
}: {
  children: React.ReactNode;
  labels: { label: string; previous: string; next: string; slide: string };
}) {
  const slides = Children.toArray(children);
  const track = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  const go = useCallback((i: number) => {
    const el = track.current?.children[(i + slides.length) % slides.length] as HTMLElement | undefined;
    // Scrolls the track only; RTL is handled by the browser.
    el?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "start" });
  }, [slides.length]);

  // Which slide is showing, from the track's own scrolling (swipe included).
  useEffect(() => {
    const root = track.current;
    if (!root) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActive([...root.children].indexOf(e.target));
        }
      },
      { root, threshold: 0.6 },
    );
    [...root.children].forEach((c) => observer.observe(c));
    return () => observer.disconnect();
  }, [slides.length]);

  useEffect(() => {
    if (paused || slides.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setTimeout(() => go(active + 1), AUTOPLAY_MS);
    return () => clearTimeout(id);
  }, [active, paused, go, slides.length]);

  if (slides.length === 1) return <>{slides}</>;

  const arrow =
    "absolute top-1/2 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-neutral-900 shadow-md backdrop-blur transition hover:bg-white group-hover:flex md:flex md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100";

  return (
    <section
      aria-roledescription="carousel"
      aria-label={labels.label}
      className="group relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div
        ref={track}
        className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain rounded-2xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {slides.map((slide, i) => (
          <div
            key={i}
            role="group"
            aria-roledescription="slide"
            aria-label={labels.slide.replace("{n}", String(i + 1)).replace("{total}", String(slides.length))}
            className="w-full shrink-0 snap-start"
          >
            {slide}
          </div>
        ))}
      </div>
      <button type="button" onClick={() => go(active - 1)} aria-label={labels.previous} className={`${arrow} start-4`}>
        <span className="rotate-180 rtl:rotate-0">
          <ChevronIcon />
        </span>
      </button>
      <button type="button" onClick={() => go(active + 1)} aria-label={labels.next} className={`${arrow} end-4`}>
        <span className="rtl:rotate-180">
          <ChevronIcon />
        </span>
      </button>
      <div className="absolute inset-x-0 bottom-3 flex justify-center gap-2">
        {slides.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => go(i)}
            aria-label={labels.slide.replace("{n}", String(i + 1)).replace("{total}", String(slides.length))}
            aria-current={i === active || undefined}
            className="h-2 w-2 rounded-full bg-white/60 shadow transition-all hover:bg-white aria-current:w-6 aria-current:bg-white"
          />
        ))}
      </div>
    </section>
  );
}
