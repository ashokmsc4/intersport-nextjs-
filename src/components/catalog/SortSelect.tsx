"use client";

import type { Dictionary } from "@/i18n/dictionaries";
import type { SortKey } from "@/lib/magento/catalog";
import { FILTER_FORM_ID } from "./FilterPanel";

/** Sort dropdown shown beside the results; submits with the filter form so filters are kept. */
export function SortSelect({
  sort,
  dict,
}: {
  sort: SortKey;
  dict: Pick<Dictionary, "filters">;
}) {
  const t = dict.filters;
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="font-semibold">{t.sortBy}</span>
      <select
        name="sort"
        form={FILTER_FORM_ID}
        defaultValue={sort}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="rounded border border-neutral-300 px-3 py-2"
      >
        <option value="recommended">{t.recommended}</option>
        <option value="newest">{t.newest}</option>
        <option value="price_asc">{t.priceLow}</option>
        <option value="price_desc">{t.priceHigh}</option>
      </select>
    </label>
  );
}
