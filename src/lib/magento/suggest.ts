import "server-only";
import type { Locale } from "@/i18n/config";
import { cardFromListItem, type ProductCardData } from "@/components/ProductCard";
import { getNavTree, listProducts, searchProducts, type NavNode } from "./catalog";
import { magentoStorefront } from "./client";

export type Suggestions = {
  products: ProductCardData[];
  /** Matching categories, with their path for context ("Men › Shoes"). */
  categories: { id: number; name: string; path: string; urlPath: string }[];
  total: number;
};

type AutocompleteResponse = {
  indexes?: { identifier: string; totalItems: number; items: { price?: string }[] }[];
};

const PRODUCT_LIMIT = 6;
const CATEGORY_LIMIT = 4;

/**
 * Product suggestions from the website's own autocomplete (Mirasvit, same results and
 * relevance as the current site). It only returns English names and no SKUs, so the
 * products are then loaded by id from the store view. Falls back to the catalog search.
 */
async function suggestProducts(locale: Locale, q: string) {
  try {
    const data = await magentoStorefront<AutocompleteResponse>("searchautocomplete/ajax/suggest/", {
      query: new URLSearchParams({ q }),
      timeoutMs: 4000,
      tags: ["search"],
    });
    const index = data.indexes?.find((i) => i.identifier === "magento_catalog_product");
    const ids = [
      ...new Set(
        (index?.items ?? [])
          .map((item) => Number(item.price?.match(/data-product-id="(\d+)"/)?.[1]))
          .filter((id) => id > 0),
      ),
    ].slice(0, PRODUCT_LIMIT);
    if (!index || !ids.length) throw new Error("no ids");

    const { items } = await listProducts(locale, { ids, pageSize: ids.length });
    const products = [...items]
      .sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id))
      .map(cardFromListItem);
    return { products, total: index.totalItems };
  } catch {
    const result = await searchProducts(locale, q, { pageSize: PRODUCT_LIMIT });
    return { products: result.items.map(cardFromListItem), total: result.total_count };
  }
}

function matchCategories(tree: NavNode[], q: string) {
  const words = q.toLocaleLowerCase().split(/\s+/).filter(Boolean);
  const found: Suggestions["categories"] = [];
  const walk = (nodes: NavNode[], trail: string[]) => {
    for (const node of nodes) {
      const path = [...trail, node.name];
      const name = node.name.toLocaleLowerCase();
      // Every word must appear in the category name or one of its parents.
      const haystack = path.join(" ").toLocaleLowerCase();
      if (words.some((w) => name.includes(w)) && words.every((w) => haystack.includes(w))) {
        found.push({ id: node.id, name: node.name, path: trail.join(" › "), urlPath: node.path });
      }
      walk(node.children, path);
    }
  };
  walk(tree, []);
  // Shallow categories first (a brand or department beats a deep leaf).
  return found
    .sort((a, b) => a.path.split("›").length - b.path.split("›").length)
    .slice(0, CATEGORY_LIMIT);
}

export async function getSuggestions(locale: Locale, q: string): Promise<Suggestions> {
  const [products, tree] = await Promise.all([
    suggestProducts(locale, q).catch(() => ({ products: [], total: 0 })),
    getNavTree(locale).catch(() => [] as NavNode[]),
  ]);
  return { ...products, categories: matchCategories(tree, q) };
}
