import type { ListingSource } from "@/app/actions/catalog";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Product, SearchResult } from "@/lib/magento/types";
import { cardFromListItem } from "@/components/ProductCard";
import { InfiniteProducts } from "./InfiniteProducts";

/** Product count and grid; later pages load as the shopper scrolls (InfiniteProducts). */
export function ProductResults({
  locale,
  dict,
  result,
  page,
  pageSize,
  params,
  path,
  source,
  sort,
}: {
  locale: Locale;
  dict: Pick<Dictionary, "category">;
  result: SearchResult<Product>;
  page: number;
  pageSize: number;
  params: Record<string, string | string[] | undefined>;
  /** Page path, e.g. /en/category/214, to tell listings apart. */
  path: string;
  source: ListingSource;
  sort: string;
}) {
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (key === "page" || value === undefined) continue;
    for (const v of Array.isArray(value) ? value : [value]) q.append(key, v);
  }
  q.sort();
  const query = q.toString();

  return (
    <>
      <p className="mb-4 text-sm text-neutral-500">
        {dict.category.results.replace("{count}", String(result.total_count))}
      </p>
      <InfiniteProducts
        // A new filter, sort or search starts a new list.
        key={`${path}?${query}&p=${page}`}
        listingKey={`${path}?${query}&p=${page}`}
        locale={locale}
        source={source}
        sort={sort}
        initial={result.items.map(cardFromListItem)}
        startPage={page}
        total={result.total_count}
        pageSize={pageSize}
        query={query}
        dict={dict}
      />
    </>
  );
}
