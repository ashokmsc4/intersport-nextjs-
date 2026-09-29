import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Product, SearchResult } from "@/lib/magento/types";
import { ProductCard, cardFromListItem } from "@/components/ProductCard";

/** Product grid with count and pagination that keeps the current query string. */
export function ProductResults({
  locale,
  dict,
  result,
  page,
  pageSize,
  params,
}: {
  locale: Locale;
  dict: Pick<Dictionary, "category">;
  result: SearchResult<Product>;
  page: number;
  pageSize: number;
  params: Record<string, string | string[] | undefined>;
}) {
  const totalPages = Math.ceil(result.total_count / pageSize);
  const pageHref = (target: number) => {
    const q = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (key === "page" || value === undefined) continue;
      for (const v of Array.isArray(value) ? value : [value]) q.append(key, v);
    }
    if (target > 1) q.set("page", String(target));
    const qs = q.toString();
    return qs ? `?${qs}` : "?";
  };

  return (
    <>
      <p className="mb-4 text-sm text-neutral-500">
        {dict.category.results.replace("{count}", String(result.total_count))}
      </p>
      <ul className="grid grid-cols-2 gap-6 sm:grid-cols-3 xl:grid-cols-4">
        {result.items.map((product) => (
          <li key={product.sku}>
            <ProductCard product={cardFromListItem(product)} locale={locale} />
          </li>
        ))}
      </ul>
      {totalPages > 1 && (
        <nav className="mt-8 flex items-center justify-center gap-4 text-sm">
          {page > 1 && <Link href={pageHref(page - 1)}>{dict.category.previous}</Link>}
          <span>
            {page} / {totalPages}
          </span>
          {page < totalPages && <Link href={pageHref(page + 1)}>{dict.category.next}</Link>}
        </nav>
      )}
    </>
  );
}
