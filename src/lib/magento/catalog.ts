import "server-only";
import type { Locale } from "@/i18n/config";
import { magentoAppSettings, magentoRest } from "./client";
import type { Category, CustomAttribute, Product, SearchResult } from "./types";

/** Visible, in-menu top-level categories, sorted by position. */
export async function getMenuCategories(locale: Locale): Promise<Category[]> {
  const root = await magentoAppSettings<Category>("data/categories.json", {
    locale,
    versioned: true,
  });
  return visibleChildren(root);
}

export function visibleChildren(category: Category): Category[] {
  return category.children_data
    .filter((c) => c.is_active && c.include_in_menu !== false)
    .sort((a, b) => a.position - b.position);
}

export async function getCategory(locale: Locale, id: number) {
  const root = await magentoAppSettings<Category>("data/categories.json", {
    locale,
    versioned: true,
  });
  return findCategory(root, id);
}

function findCategory(node: Category, id: number): Category | null {
  if (node.id === id) return node;
  for (const child of node.children_data) {
    const found = findCategory(child, id);
    if (found) return found;
  }
  return null;
}

export type ProductListParams = {
  categoryId: number;
  page?: number;
  pageSize?: number;
};

/** Catalog-visible products in a category, in merchandised (position) order. */
export function getCategoryProducts(
  locale: Locale,
  { categoryId, page = 1, pageSize = 24 }: ProductListParams,
) {
  const q = new URLSearchParams();
  const f = "searchCriteria[filter_groups]";
  q.set(`${f}[0][filters][0][field]`, "category_id");
  q.set(`${f}[0][filters][0][value]`, String(categoryId));
  q.set(`${f}[0][filters][0][condition_type]`, "eq");
  q.set(`${f}[1][filters][0][field]`, "visibility");
  q.set(`${f}[1][filters][0][value]`, "4");
  q.set("searchCriteria[sortOrders][0][field]", "position");
  q.set("searchCriteria[sortOrders][0][direction]", "ASC");
  q.set("searchCriteria[pageSize]", String(pageSize));
  q.set("searchCriteria[currentPage]", String(page));

  return magentoRest<SearchResult<Product>>("V1/mstore/products", {
    locale,
    query: q,
    tags: [`category:${categoryId}`],
  });
}

export function attr(
  attributes: CustomAttribute[],
  code: string,
): string | undefined {
  const value = attributes.find((a) => a.attribute_code === code)?.value;
  return Array.isArray(value) ? value.join(",") : value;
}
