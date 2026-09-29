import "server-only";
import type { Locale } from "@/i18n/config";
import { magentoAppSettings, magentoRest } from "./client";
import type {
  Category,
  CustomAttribute,
  Product,
  ProductDetail,
  SearchResult,
} from "./types";

/** Visible, in-menu top-level categories, sorted by position. */
export async function getMenuCategories(locale: Locale): Promise<Category[]> {
  const root = await magentoAppSettings<Category>("data/categories.json", {
    locale,
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

export type SortKey = "recommended" | "newest" | "price_asc" | "price_desc";

export const SORT_KEYS: SortKey[] = ["recommended", "newest", "price_asc", "price_desc"];

const SORTS: Record<SortKey, [field: string, direction: "ASC" | "DESC"]> = {
  recommended: ["position", "ASC"],
  newest: ["created_at", "DESC"],
  price_asc: ["price", "ASC"],
  price_desc: ["price", "DESC"],
};

export type ProductListParams = {
  categoryId?: number;
  /** Free-text search on name or SKU. */
  search?: string;
  /** Attribute code -> selected option ids, e.g. { vendor_name: ["2553"] }. */
  filters?: Record<string, string[]>;
  sort?: SortKey;
  page?: number;
  pageSize?: number;
};

/**
 * Catalog-visible products via `V1/mstore/products`. Each filter group is ANDed;
 * options inside one attribute are ORed with an `in` condition.
 */
export function listProducts(
  locale: Locale,
  {
    categoryId,
    search,
    filters = {},
    ids,
    sort = "recommended",
    page = 1,
    pageSize = 24,
  }: ProductListParams & { ids?: number[] },
) {
  const q = new URLSearchParams();
  let group = 0;
  const add = (
    conditions: { field: string; value: string; type: string }[],
  ) => {
    conditions.forEach((c, i) => {
      const f = `searchCriteria[filter_groups][${group}][filters][${i}]`;
      q.set(`${f}[field]`, c.field);
      q.set(`${f}[value]`, c.value);
      q.set(`${f}[condition_type]`, c.type);
    });
    group++;
  };

  add([{ field: "visibility", value: "4", type: "eq" }]);
  if (categoryId) add([{ field: "category_id", value: String(categoryId), type: "eq" }]);
  if (search) {
    // Reliable for a single word or SKU; multi-word queries go through searchProducts.
    const pattern = `%${search.trim()}%`;
    add([
      { field: "name", value: pattern, type: "like" },
      { field: "sku", value: pattern, type: "like" },
    ]);
  }
  if (ids?.length) add([{ field: "entity_id", value: ids.join(","), type: "in" }]);
  for (const [code, values] of Object.entries(filters)) {
    if (values.length) add([{ field: code, value: values.join(","), type: "in" }]);
  }

  const [field, direction] = SORTS[sort];
  // Search has no merchandised position, so "recommended" keeps the API default there.
  if (!(sort === "recommended" && !categoryId)) {
    q.set("searchCriteria[sortOrders][0][field]", field);
    q.set("searchCriteria[sortOrders][0][direction]", direction);
  }
  q.set("searchCriteria[pageSize]", String(pageSize));
  q.set("searchCriteria[currentPage]", String(page));

  return magentoRest<SearchResult<Product>>("V1/mstore/products", {
    locale,
    query: q,
    tags: categoryId ? [`category:${categoryId}`] : ["search"],
  });
}

/**
 * Text search. One word (or an SKU) uses the product endpoint's name/SKU match;
 * several words use Magento's full-text search (`V1/search`, the store's own
 * engine and relevance), then load those products in relevance order.
 */
export async function searchProducts(
  locale: Locale,
  query: string,
  { sort = "recommended", page = 1, pageSize = 24 }: Pick<ProductListParams, "sort" | "page" | "pageSize">,
): Promise<SearchResult<Product>> {
  const words = query.trim().split(/\s+/).filter(Boolean);
  if (words.length <= 1) {
    return listProducts(locale, { search: words[0] ?? "", sort, page, pageSize });
  }

  const q = new URLSearchParams();
  const f = "searchCriteria[filter_groups][0][filters][0]";
  q.set("searchCriteria[requestName]", "quick_search_container");
  q.set(`${f}[field]`, "search_term");
  q.set(`${f}[value]`, words.join(" "));
  q.set("searchCriteria[pageSize]", String(pageSize));
  q.set("searchCriteria[currentPage]", String(page));
  const hits = await magentoRest<{ items: { id: number }[]; total_count: number }>(
    "V1/search",
    { locale, query: q, tags: ["search"] },
  );
  const ids = hits.items.map((h) => h.id);
  if (!ids.length) return { items: [], total_count: hits.total_count };

  const products = await listProducts(locale, { ids, sort, pageSize });
  const items =
    sort === "recommended"
      ? [...products.items].sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id))
      : products.items;
  return { items, total_count: hits.total_count };
}

/** Catalog-visible products in a category, in merchandised (position) order. */
export function getCategoryProducts(
  locale: Locale,
  params: Omit<ProductListParams, "categoryId"> & { categoryId: number },
) {
  return listProducts(locale, params);
}

export type FilterGroup = {
  attribute_code: string;
  default_frontend_label: string;
  options: { label: string; value: string }[];
};

// Order used by the app (settings/config.json -> filterSortOrder; "brands" is vendor_name).
const FILTER_ORDER = ["gender", "sports", "department", "vendor_name", "EU_Sizes"];

/** Filterable attributes and their options for a category (`V1/m2-attributes`). */
export async function getFilters(locale: Locale, categoryId: number) {
  const data = await magentoRest<{ items: FilterGroup[] }[]>("V1/m2-attributes", {
    locale,
    query: new URLSearchParams({ category_id: String(categoryId) }),
    tags: [`filters:${categoryId}`],
  });
  const rank = (code: string) => {
    const i = FILTER_ORDER.indexOf(code);
    return i === -1 ? FILTER_ORDER.length : i;
  };
  return (data[0]?.items ?? [])
    .filter((g) => g.options?.length)
    .sort((a, b) => rank(a.attribute_code) - rank(b.attribute_code));
}

/** Reads `?code=value&code=value` filters, keeping only known attributes and numeric ids. */
export function selectedFilters(
  searchParams: Record<string, string | string[] | undefined>,
  groups: FilterGroup[],
) {
  const selected: Record<string, string[]> = {};
  for (const g of groups) {
    const raw = searchParams[g.attribute_code];
    const values = (Array.isArray(raw) ? raw : raw ? [raw] : []).filter((v) =>
      /^\d+$/.test(v),
    );
    if (values.length) selected[g.attribute_code] = values;
  }
  return selected;
}

export const parseSort = (value: unknown): SortKey =>
  SORT_KEYS.includes(value as SortKey) ? (value as SortKey) : "recommended";

export function attr(
  attributes: CustomAttribute[],
  code: string,
): string | undefined {
  const value = attributes.find((a) => a.attribute_code === code)?.value;
  return Array.isArray(value) ? value.join(",") : value;
}

/** Full product by SKU (the endpoint looks products up by SKU, not entity id). */
export async function getProductDetail(
  locale: Locale,
  sku: string,
): Promise<ProductDetail | null> {
  const data = await magentoRest<{ product_detail?: ProductDetail[] }>(
    `V1/aaw/productdetail/${encodeURIComponent(sku)}`,
    { locale, tags: [`product:${sku}`] },
  );
  return data.product_detail?.[0] ?? null;
}

export function getRecommendations(locale: Locale, sku: string) {
  return magentoRest<ProductDetail[]>(
    `V1/mstore/recommend-products/sku/${encodeURIComponent(sku)}`,
    { locale, tags: [`recommendations:${sku}`] },
  );
}

/** Price to charge now, taking an active special price into account. */
export function effectivePrice(product: {
  price: string | number;
  special_price?: string | number | null;
  special_from_date?: string | null;
  special_to_date?: string | null;
}) {
  const price = Number(product.price);
  const special = Number(product.special_price);
  const now = Date.now();
  const started =
    !product.special_from_date || Date.parse(product.special_from_date) <= now;
  const notEnded =
    !product.special_to_date || Date.parse(product.special_to_date) >= now;
  const onSale = special > 0 && special < price && started && notEnded;
  return { price, final: onSale ? special : price, onSale };
}
