"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useTransition } from "react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import type { FilterGroup, PriceRange } from "@/lib/magento/catalog";
import { PriceFilter } from "./PriceFilter";

/** Id of the filter form; SortSelect joins it through the `form` attribute. */
export const FILTER_FORM_ID = "listing-filters";

/**
 * Plain GET form so filtered URLs are shareable and work without JavaScript;
 * with JavaScript every change navigates in place (the panel stays put while
 * the results reload).
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
  /** Price slider stops and the chosen bounds; omitted when the listing has no price spread. */
  price?: { steps: number[]; selected: PriceRange };
  locale: Locale;
  /** Search term to keep when filtering search results. */
  query?: string;
  clearHref: string;
  dict: Pick<Dictionary, "filters">;
}) {
  const t = dict.filters;
  const submit = (e: React.ChangeEvent<HTMLInputElement>) =>
    e.currentTarget.form?.requestSubmit();
  const priceActive = price?.selected.min !== undefined || price?.selected.max !== undefined;
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
    startTransition(() => router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  };

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
        <div className="flex flex-col gap-3">
          <p className="font-semibold">
            {t.title}
            {active > 0 && ` (${active})`}
          </p>
          {price && (
            <details open className="border-b border-neutral-200 pb-3">
              <summary className="cursor-pointer text-sm font-semibold">
                {t.price}
                {priceActive && " (1)"}
              </summary>
              <PriceFilter
                // Fresh slider state per listing and per applied range.
                key={`${price.steps.join(",")}|${price.selected.min}|${price.selected.max}`}
                steps={price.steps}
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
                className="border-b border-neutral-200 pb-3"
              >
                <summary className="cursor-pointer text-sm font-semibold">
                  {group.default_frontend_label}
                  {chosen.length > 0 && ` (${chosen.length})`}
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
      )}

      <noscript>
        <button type="submit" className="rounded border border-neutral-800 px-4 py-2 text-sm">
          {t.apply}
        </button>
      </noscript>
      {active > 0 && (
        <Link href={clearHref} scroll={false} className="text-sm text-brand underline">
          {t.clear}
        </Link>
      )}
    </form>
  );
}
