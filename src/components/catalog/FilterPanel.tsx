"use client";

import type { Dictionary } from "@/i18n/dictionaries";
import type { FilterGroup, SortKey } from "@/lib/magento/catalog";

/**
 * Plain GET form so filtered URLs are shareable and work without JavaScript;
 * with JavaScript every change submits immediately.
 */
export function FilterPanel({
  groups,
  selected,
  sort,
  query,
  clearHref,
  dict,
}: {
  groups: FilterGroup[];
  selected: Record<string, string[]>;
  sort: SortKey;
  /** Search term to keep when filtering search results. */
  query?: string;
  clearHref: string;
  dict: Pick<Dictionary, "filters">;
}) {
  const t = dict.filters;
  const submit = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    e.currentTarget.form?.requestSubmit();
  const active = Object.values(selected).flat().length;

  return (
    <form method="get" className="flex flex-col gap-4">
      {query !== undefined && <input type="hidden" name="q" value={query} />}
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-semibold">{t.sortBy}</span>
        <select
          name="sort"
          defaultValue={sort}
          onChange={submit}
          className="rounded border border-neutral-300 px-3 py-2"
        >
          <option value="recommended">{t.recommended}</option>
          <option value="newest">{t.newest}</option>
          <option value="price_asc">{t.priceLow}</option>
          <option value="price_desc">{t.priceHigh}</option>
        </select>
      </label>

      {groups.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="font-semibold">
            {t.title}
            {active > 0 && ` (${active})`}
          </p>
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
        <a href={clearHref} className="text-sm text-brand underline">
          {t.clear}
        </a>
      )}
    </form>
  );
}
