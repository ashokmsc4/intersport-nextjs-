"use client";

import { useEffect, useRef, useState } from "react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { formatPrice } from "@/lib/format";

const SLIDE_SUBMIT_DELAY = 500;

/**
 * Price slider plus Min/Max selects over the same stops. The selects carry the
 * form values (price_min / price_max), so the filter works without JavaScript;
 * the ends of the range mean "no bound" and are left out of the URL.
 */
export function PriceFilter({
  steps: baseSteps,
  min,
  max,
  locale,
  dict,
}: {
  steps: number[];
  min?: number;
  max?: number;
  locale: Locale;
  dict: Pick<Dictionary, "filters">;
}) {
  const t = dict.filters;
  // A bound from the URL that isn't a stop still gets its own stop.
  const steps = [...new Set([...baseSteps, min, max].filter((v) => v !== undefined))].sort(
    (a, b) => a - b,
  );
  const last = steps.length - 1;
  const [lo, setLo] = useState(min === undefined ? 0 : steps.indexOf(min));
  const [hi, setHi] = useState(max === undefined ? last : steps.indexOf(max));
  const root = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  // Submit after state has rendered into the selects.
  const submitSoon = (delay: number) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(
      () => root.current?.closest("form")?.requestSubmit(),
      delay,
    );
  };
  const minValue = lo === 0 ? "" : String(steps[lo]);
  const maxValue = hi === last ? "" : String(steps[hi]);
  const label = (v: number) => formatPrice(v, locale, { trim: true });
  const pct = (i: number) => `${(i / last) * 100}%`;

  return (
    <div ref={root} className="flex flex-col gap-4 pt-3">
      <div className="price-range relative h-[18px]">
        <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded bg-neutral-200" />
        <div
          className="absolute top-1/2 h-1 -translate-y-1/2 rounded bg-brand"
          style={{ insetInlineStart: pct(lo), insetInlineEnd: `calc(100% - ${pct(hi)})` }}
        />
        <input
          type="range"
          min={0}
          max={last}
          value={lo}
          aria-label={t.minPrice}
          aria-valuetext={label(steps[lo])}
          onChange={(e) => {
            setLo(Math.min(Number(e.target.value), hi - 1));
            submitSoon(SLIDE_SUBMIT_DELAY);
          }}
        />
        <input
          type="range"
          min={0}
          max={last}
          value={hi}
          aria-label={t.maxPrice}
          aria-valuetext={label(steps[hi])}
          onChange={(e) => {
            setHi(Math.max(Number(e.target.value), lo + 1));
            submitSoon(SLIDE_SUBMIT_DELAY);
          }}
        />
      </div>
      <div className="flex items-center gap-2 text-sm">
        <select
          name="price_min"
          value={minValue}
          aria-label={t.minPrice}
          onChange={(e) => {
            setLo(e.target.value ? steps.indexOf(Number(e.target.value)) : 0);
            submitSoon(0);
          }}
          className="min-w-0 flex-1 rounded border border-neutral-300 px-2 py-2"
        >
          <option value="">{t.min}</option>
          {steps.slice(1, last).map((v, i) => (
            <option key={v} value={v} disabled={i + 1 >= hi}>
              {label(v)}
            </option>
          ))}
        </select>
        <span className="text-neutral-500">{t.to}</span>
        <select
          name="price_max"
          value={maxValue}
          aria-label={t.maxPrice}
          onChange={(e) => {
            setHi(e.target.value ? steps.indexOf(Number(e.target.value)) : last);
            submitSoon(0);
          }}
          className="min-w-0 flex-1 rounded border border-neutral-300 px-2 py-2"
        >
          {steps.slice(1, last).map((v, i) => (
            <option key={v} value={v} disabled={i + 1 <= lo}>
              {label(v)}
            </option>
          ))}
          <option value="">{t.max}</option>
        </select>
      </div>
    </div>
  );
}
