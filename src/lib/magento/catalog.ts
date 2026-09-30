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

export type PriceRange = { min?: number; max?: number };

export type ProductListParams = {
  categoryId?: number;
  /** Free-text search on name or SKU. */
  search?: string;
  /** Attribute code -> selected option ids, e.g. { vendor_name: ["2553"] }. */
  filters?: Record<string, string[]>;
  /**
   * Inclusive bounds on the price shown to shoppers. Applied by getCategoryProducts
   * (the list endpoint ignores price conditions).
   */
  price?: PriceRange;
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

// A price range is applied here: batches of the category are loaded and filtered.
const PRICE_BATCH = 200;
const PRICE_SCAN_LIMIT = 2000;

/**
 * Catalog-visible products in a category, in merchandised (position) order.
 * With a price range, the category's products (up to PRICE_SCAN_LIMIT) are
 * loaded in batches, kept when their shown price is in range, and paged here.
 */
export async function getCategoryProducts(
  locale: Locale,
  params: Omit<ProductListParams, "categoryId"> & { categoryId: number },
): Promise<SearchResult<Product>> {
  const { price, page = 1, pageSize = 24, ...rest } = params;
  if (price?.min === undefined && price?.max === undefined) {
    return listProducts(locale, { ...rest, page, pageSize });
  }
  const batch = (n: number) => listProducts(locale, { ...rest, page: n, pageSize: PRICE_BATCH });
  const first = await batch(1);
  const pages = Math.min(
    Math.ceil(first.total_count / PRICE_BATCH),
    PRICE_SCAN_LIMIT / PRICE_BATCH,
  );
  const more = await Promise.all(Array.from({ length: Math.max(0, pages - 1) }, (_, i) => batch(i + 2)));
  const inRange = (p: Product) => {
    const shown = listedPrice(p);
    return (
      shown > 0 &&
      (price.min === undefined || shown >= price.min) &&
      (price.max === undefined || shown <= price.max)
    );
  };
  const matched = [first, ...more].flatMap((r) => r.items).filter(inRange);
  return {
    items: matched.slice((page - 1) * pageSize, page * pageSize),
    total_count: matched.length,
  };
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

/** Price a listed product shows (configurables list with price 0; minimal_price is the real one). */
function listedPrice(product: Product) {
  const a = product.custom_attributes;
  return effectivePrice({
    price: product.price || Number(attr(a, "minimal_price") ?? 0),
    special_price: attr(a, "special_price"),
    special_from_date: attr(a, "special_from_date"),
    special_to_date: attr(a, "special_to_date"),
  }).final;
}

/**
 * Cheapest and dearest shown price in a category, for the price slider: the first
 * page of each price sort plus the merchandised first page (configurables list with
 * price 0, so the sorts alone can miss them; the list endpoint has no aggregations).
 */
export async function getPriceBounds(locale: Locale, categoryId: number) {
  const pages = await Promise.all(
    (["price_asc", "price_desc", "recommended"] as const).map((sort) =>
      listProducts(locale, { categoryId, sort, pageSize: 48 }),
    ),
  );
  const prices = pages.flatMap((r) => r.items).map(listedPrice).filter((p) => p > 0);
  if (!prices.length) return null;
  return { min: Math.min(...prices), max: Math.max(...prices) };
}

/** Slider range around the bounds: whole KWD ends and a step that suits the spread. */
export function sliderRange({ min, max }: { min: number; max: number }) {
  const lo = Math.floor(min);
  const hi = Math.max(Math.ceil(max), lo + 1);
  return { min: lo, max: hi, step: hi - lo <= 10 ? 0.5 : 1 };
}

/** Reads `?price_min=&price_max=`, dropping blanks, negatives and an inverted range. */
export function selectedPrice(
  searchParams: Record<string, string | string[] | undefined>,
): PriceRange {
  const read = (key: string) => {
    const raw = searchParams[key];
    const n = Number(Array.isArray(raw) ? raw[0] : raw);
    return raw !== undefined && raw !== "" && Number.isFinite(n) && n >= 0 ? n : undefined;
  };
  const min = read("price_min");
  const max = read("price_max");
  if (min !== undefined && max !== undefined && min > max) return {};
  return { min, max };
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

/** Menu node: visible categories only, in shop order. */
export type NavNode = { id: number; name: string; children: NavNode[] };

function toNav(category: Category): NavNode {
  return {
    id: category.id,
    name: category.name,
    children: visibleChildren(category).map(toNav),
  };
}

/** L1 → L2 → L3 menu tree (deeper levels are reached from category pages). */
export async function getNavTree(locale: Locale): Promise<NavNode[]> {
  const root = await magentoAppSettings<Category>("data/categories.json", { locale });
  const trim = (node: NavNode, depth: number): NavNode => ({
    ...node,
    children: depth >= 3 ? [] : node.children.map((c) => trim(c, depth + 1)),
  });
  return visibleChildren(root).map((c) => trim(toNav(c), 1));
}

/** Categories from the top level down to `id` (for breadcrumbs), or [] if not found. */
export async function getCategoryPath(locale: Locale, id: number): Promise<Category[]> {
  const root = await magentoAppSettings<Category>("data/categories.json", { locale });
  const walk = (node: Category, trail: Category[]): Category[] | null => {
    if (node.id === id) return trail;
    for (const child of node.children_data) {
      const found = walk(child, [...trail, child]);
      if (found) return found;
    }
    return null;
  };
  return walk(root, []) ?? [];
}
