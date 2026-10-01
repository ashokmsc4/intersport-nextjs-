"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import type { FilterGroup, PriceRange } from "@/lib/magento/catalog";
import { ChevronIcon, CloseIcon, FilterIcon } from "@/components/icons";
import { PriceFilter } from "./PriceFilter";

/** Group heading with a chevron that turns as the group opens (no native marker). */
const summaryClass =
  "flex cursor-pointer list-none items-center justify-between gap-2 py-1 text-sm font-semibold [&::-webkit-details-marker]:hidden";

function Chevron() {
  return (
    <span className="text-neutral-500 transition-transform [&_svg]:size-4 rotate-90 group-open:-rotate-90">
      <ChevronIcon />
    </span>
  );
}

/** Id of the filter form; SortSelect joins it through the `form` attribute. */
export const FILTER_FORM_ID = "listing-filters";

/**
 * Plain GET form so filtered URLs are shareable and work without JavaScript;
 * with JavaScript every change navigates in place (the panel stays put while
 * the results reload).
 * Below `lg` the panel is a slide-in drawer opened from a "Filters" button.
 */
export function FilterPanel({
  groups,
  selected,
  price,
  locale,
  query,
  clearHref,
  dict,
}: {
  groups: FilterGroup[];
  selected: Record<string, string[]>;
  /** Price slider range and the chosen bounds; omitted when the listing has no prices. */
  price?: { min: number; max: number; step: number; selected: PriceRange };
  locale: Locale;
  /** Search term to keep when filtering search results. */
  query?: string;
  clearHref: string;
  dict: Pick<Dictionary, "filters">;
}) {
  const t = dict.filters;
  const submit = (e: React.ChangeEvent<HTMLInputElement>) =>
    e.currentTarget.form?.requestSubmit();
  const [open, setOpen] = useState(false);
  const priceActive =
    price?.selected.min !== undefined || price?.selected.max !== undefined;
  const active = Object.values(selected).flat().length + (priceActive ? 1 : 0);

  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const navigate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // FormData fires the formdata event below, so blank price bounds are pruned here too.
    const params = new URLSearchParams(
      [...new FormData(e.currentTarget)].map(([k, v]) => [k, String(v)]),
    );
    const qs = params.toString();
    startTransition(() =>
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false }),
    );
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [open]);

  // Leave unset price bounds out of the URL instead of sending `price_min=`.
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    const el = form.current;
    const prune = (e: FormDataEvent) => {
      for (const key of ["price_min", "price_max"]) {
        if (e.formData.get(key) === "") e.formData.delete(key);
      }
    };
    el?.addEventListener("formdata", prune);
    return () => el?.removeEventListener("formdata", prune);
  }, []);

  return (
    <form
      ref={form}
      id={FILTER_FORM_ID}
      method="get"
      onSubmit={navigate}
      aria-busy={pending || undefined}
      className="flex flex-col gap-4 transition-opacity aria-busy:opacity-70"
    >
      {query !== undefined && <input type="hidden" name="q" value={query} />}
      {(groups.length > 0 || price) && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-expanded={open}
          aria-controls={`${FILTER_FORM_ID}-panel`}
          className="flex w-full items-center justify-center gap-2 rounded border border-neutral-300 px-4 py-2.5 text-sm font-semibold lg:hidden"
        >
          <FilterIcon />
          {t.showFilters}
          {active > 0 && (
            <span className="min-w-5 rounded-full bg-brand px-1.5 text-xs leading-5 text-white">
              {active}
            </span>
          )}
        </button>
      )}
      {(groups.length > 0 || price) && (
        <div
          className={`${open ? "fixed inset-0 z-50 flex" : "hidden"} lg:static lg:z-auto lg:flex lg:flex-col`}
          role={open ? "dialog" : undefined}
          aria-modal={open || undefined}
          aria-label={open ? t.title : undefined}
        >
          <button
            type="button"
            tabIndex={-1}
            aria-label={t.closeFilters}
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/40 lg:hidden"
          />
          <div
            id={`${FILTER_FORM_ID}-panel`}
            className="relative flex h-full w-[88%] max-w-sm flex-col bg-white shadow-xl lg:h-auto lg:w-auto lg:max-w-none lg:bg-transparent lg:shadow-none"
          >
            <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3 lg:border-0 lg:p-0">
              <p className="font-semibold">
                {t.title}
                {active > 0 && ` (${active})`}
              </p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t.closeFilters}
                className="-me-2 p-2 lg:hidden"
              >
                <CloseIcon />
              </button>
            </div>
            <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-3 lg:overflow-visible lg:p-0 lg:pt-3">
              {price && (
                <details
                  open
                  className="group border-b border-neutral-200 pb-4"
                >
                  <summary className={summaryClass}>
                    <span>
                      {t.priceRange}
                      {priceActive && " (1)"}
                    </span>
                    <Chevron />
                  </summary>
                  <PriceFilter
                    // Fresh state per listing and per applied range.
                    key={`${price.min}-${price.max}|${price.selected.min}|${price.selected.max}`}
                    floor={price.min}
                    ceil={price.max}
                    step={price.step}
                    min={price.selected.min}
                    max={price.selected.max}
                    locale={locale}
                    dict={dict}
                  />
                </details>
              )}
              {groups.map((group) => {
                const chosen = selected[group.attribute_code] ?? [];
                return (
                  <details
                    key={group.attribute_code}
                    open={chosen.length > 0}
                    className="group border-b border-neutral-200 pb-3"
                  >
                    <summary className={summaryClass}>
                      <span>
                        {group.default_frontend_label}
                        {chosen.length > 0 && ` (${chosen.length})`}
                      </span>
                      <Chevron />
                    </summary>
                    <ul className="mt-2 flex max-h-60 flex-col gap-1 overflow-y-auto text-sm">
                      {group.options.map((option) => (
                        <li key={option.value}>
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              name={group.attribute_code}
                              value={option.value}
                              defaultChecked={chosen.includes(option.value)}
                              onChange={submit}
                            />
                            {option.label}
                          </label>
                        </li>
                      ))}
                    </ul>
                  </details>
                );
              })}
            </div>
            <div className="flex items-center gap-3 border-t border-neutral-200 px-4 py-3 lg:hidden">
              {active > 0 && (
                <Link
                  href={clearHref}
                  scroll={false}
                  className="text-sm font-semibold text-brand underline"
                >
                  {t.clear}
                </Link>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex-1 rounded bg-brand px-4 py-3 text-sm font-semibold text-white"
              >
                {t.showResults}
              </button>
            </div>
          </div>
        </div>
      )}

      <noscript>
        <button
          type="submit"
          className="rounded border border-neutral-800 px-4 py-2 text-sm"
        >
          {t.apply}
        </button>
      </noscript>
      {active > 0 && (
        <Link
          href={clearHref}
          scroll={false}
          className="text-sm text-brand underline max-lg:hidden"
        >
          {t.clear}
        </Link>
      )}
    </form>
  );
}
