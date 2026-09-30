"use client";

import { useState } from "react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { formatPrice } from "@/lib/format";

/**
 * Price range: a two-thumb slider and Min / Max number boxes kept in step, applied
 * with the Apply button (or Enter). The boxes carry the form values (price_min /
 * price_max), so the filter works without JavaScript; a bound left at the end of
 * the range is sent blank and dropped from the URL.
 */
export function PriceFilter({
  floor,
  ceil,
  step,
  min,
  max,
  locale,
  dict,
}: {
  /** Slider range for the listing. */
  floor: number;
  ceil: number;
  step: number;
  /** Bounds applied from the URL. */
  min?: number;
  max?: number;
  locale: Locale;
  dict: Pick<Dictionary, "filters">;
}) {
  const t = dict.filters;
  // Text so a box can be emptied (no bound) or typed through partial values.
  const [lo, setLo] = useState(min === undefined ? "" : String(min));
  const [hi, setHi] = useState(max === undefined ? "" : String(max));
  const clamp = (v: number) => Math.min(ceil, Math.max(floor, v));
  const loValue = lo === "" ? floor : clamp(Number(lo) || floor);
  const hiValue = hi === "" ? ceil : clamp(Number(hi) || ceil);
  const pct = (v: number) => `${((v - floor) / (ceil - floor)) * 100}%`;
  // Thumbs at the ends mean "no bound".
  const fromSlider = (v: number, end: number) => (v === end ? "" : String(v));

  const box =
    "w-full min-w-0 rounded-md border border-neutral-200 bg-neutral-100 px-3 py-2.5 text-sm placeholder:text-neutral-400 focus:border-brand focus:bg-white focus:outline-none";

  return (
    <div className="flex flex-col gap-4 pt-4">
      <div className="price-range relative h-5">
        <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-neutral-200" />
        <div
          className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-brand"
          style={{ insetInlineStart: pct(loValue), insetInlineEnd: `calc(100% - ${pct(hiValue)})` }}
        />
        <input
          type="range"
          min={floor}
          max={ceil}
          step={step}
          value={loValue}
          aria-label={t.minPrice}
          aria-valuetext={formatPrice(loValue, locale, { trim: true })}
          onChange={(e) => setLo(fromSlider(Math.min(Number(e.target.value), hiValue - step), floor))}
        />
        <input
          type="range"
          min={floor}
          max={ceil}
          step={step}
          value={hiValue}
          aria-label={t.maxPrice}
          aria-valuetext={formatPrice(hiValue, locale, { trim: true })}
          onChange={(e) => setHi(fromSlider(Math.max(Number(e.target.value), loValue + step), ceil))}
        />
      </div>
      <div className="flex items-center gap-2">
        <input
          type="number"
          name="price_min"
          inputMode="decimal"
          min={0}
          step="any"
          value={lo}
          placeholder={t.min}
          aria-label={t.minPrice}
          onChange={(e) => setLo(e.target.value)}
          className={box}
        />
        <span aria-hidden className="text-neutral-400">
          –
        </span>
        <input
          type="number"
          name="price_max"
          inputMode="decimal"
          min={0}
          step="any"
          value={hi}
          placeholder={t.max}
          aria-label={t.maxPrice}
          onChange={(e) => setHi(e.target.value)}
          className={box}
        />
      </div>
      <p className="-mt-2 flex justify-between text-xs text-neutral-500">
        <span>{formatPrice(floor, locale, { trim: true })}</span>
        <span>{formatPrice(ceil, locale, { trim: true })}</span>
      </p>
      <button
        type="submit"
        className="rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand/90"
      >
        {t.apply}
      </button>
    </div>
  );
}
