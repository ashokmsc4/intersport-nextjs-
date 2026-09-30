"use server";

import { hasLocale } from "@/i18n/config";
import { getCategoryProducts, parseSort, searchProducts, type PriceRange } from "@/lib/magento/catalog";
import { describeError } from "@/lib/magento/diagnose";
import { cardFromListItem, type ProductCardData } from "@/components/ProductCard";

/** Which listing to continue: a category (with its filters) or a search. */
export type ListingSource =
  | { type: "category"; categoryId: number; filters: Record<string, string[]>; price: PriceRange }
  | { type: "search"; q: string };

export type ListingPage =
  | { ok: true; products: ProductCardData[]; total: number }
  | { ok: false; error: string };

const MAX_PAGE = 500;

/** Next page of a product listing, for infinite scroll. Inputs come from the browser, so they're checked. */
export async function loadListingPage(input: {
  locale: string;
  source: ListingSource;
  sort: string;
  page: number;
  pageSize: number;
}): Promise<ListingPage> {
  const locale = hasLocale(input.locale) ? input.locale : "en";
  const page = Math.trunc(Number(input.page));
  const pageSize = Math.min(48, Math.max(1, Math.trunc(Number(input.pageSize)) || 24));
  if (!(page >= 1 && page <= MAX_PAGE)) return { ok: false, error: "bad page" };
  const sort = parseSort(input.sort);
  const { source } = input;

  try {
    if (source.type === "category") {
      const categoryId = Math.trunc(Number(source.categoryId));
      if (!(categoryId > 0)) return { ok: false, error: "bad category" };
      // Attribute codes and option ids only, as the filter panel produces.
      const filters = Object.fromEntries(
        Object.entries(source.filters ?? {})
          .filter(([code]) => /^[a-z][a-z0-9_]{0,40}$/.test(code))
          .map(([code, values]) => [code, (Array.isArray(values) ? values : []).filter((v) => /^\d{1,10}$/.test(String(v))).slice(0, 50)])
          .filter(([, values]) => values.length > 0),
      ) as Record<string, string[]>;
      const bound = (v: unknown) => {
        const n = Number(v);
        return v != null && Number.isFinite(n) && n >= 0 ? n : undefined;
      };
      const price = { min: bound(source.price?.min), max: bound(source.price?.max) };
      const result = await getCategoryProducts(locale, { categoryId, filters, price, sort, page, pageSize });
      return { ok: true, products: result.items.map(cardFromListItem), total: result.total_count };
    }
    const q = String(source.q ?? "").trim().slice(0, 100);
    if (!q) return { ok: false, error: "empty query" };
    const result = await searchProducts(locale, q, { sort, page, pageSize });
    return { ok: true, products: result.items.map(cardFromListItem), total: result.total_count };
  } catch (error) {
    return { ok: false, error: describeError(error) };
  }
}
