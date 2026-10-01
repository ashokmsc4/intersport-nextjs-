import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound, permanentRedirect } from "next/navigation";
import { after } from "next/server";
import { hasLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import {
  getCategory,
  getCategoryIndex,
  getCategoryPath,
  getCategoryProducts,
  getFilters,
  getPriceBounds,
  parseSort,
  sliderRange,
  selectedFilters,
  selectedPrice,
  visibleChildren,
} from "@/lib/magento/catalog";
import { BackendError } from "@/components/BackendError";
import { FilterPanel } from "@/components/catalog/FilterPanel";
import { SortSelect } from "@/components/catalog/SortSelect";
import { Breadcrumbs } from "@/components/nav/Breadcrumbs";
import { settle } from "@/lib/magento/diagnose";
import { ProductResults } from "@/components/catalog/ProductResults";
import { warmProductPages } from "@/lib/magento/warm";
import { categoryHref } from "@/lib/urls";
import { SEO_REWRITE_HEADER } from "@/lib/seo";

const PAGE_SIZE = 24;

// Query keys that are never product filters.
const NOT_FILTERS = new Set(["sort", "page", "q", "price_min", "price_max", "gclid", "fbclid", "msclkid"]);

/** Filters as they appear in the URL: attribute codes with numeric option ids. */
function filtersFromQuery(query: Record<string, string | string[] | undefined>) {
  const filters: Record<string, string[]> = {};
  for (const [key, raw] of Object.entries(query)) {
    if (NOT_FILTERS.has(key) || key.startsWith("utm_") || !/^[a-z][a-z0-9_]*$/.test(key)) continue;
    const values = (Array.isArray(raw) ? raw : raw ? [raw] : []).filter((v) => /^\d+$/.test(v));
    if (values.length) filters[key] = values;
  }
  return filters;
}

const sameFilters = (a: Record<string, string[]>, b: Record<string, string[]>) =>
  JSON.stringify(Object.entries(a).sort()) === JSON.stringify(Object.entries(b).sort());

/** The category, or the reason Magento couldn't be read (the page then shows a notice). */
async function load(lang: string, id: string) {
  const categoryId = Number(id);
  if (!hasLocale(lang) || !Number.isInteger(categoryId)) notFound();
  const { value: category, error } = await settle(getCategory(lang, categoryId), `category ${id}`);
  if (error !== null) return { locale: lang as Locale, category: null, error };
  if (!category) notFound();
  return { locale: lang as Locale, category, error: null };
}

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/category/[id]">): Promise<Metadata> {
  const { lang, id } = await params;
  const { category } = await load(lang, id);
  if (!category) return {};
  // Canonical SEO URL, and the same category in the other language (keys can differ).
  const [en, ar] = await Promise.all(
    (["en", "ar"] as const).map((l) =>
      getCategoryIndex(l)
        .then((index) => categoryHref(l, { id: category.id, path: index.pathById.get(category.id) }))
        .catch(() => categoryHref(l, { id: category.id })),
    ),
  );
  return {
    title: category.name,
    alternates: { canonical: lang === "ar" ? ar : en, languages: { en, ar } },
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: PageProps<"/[lang]/category/[id]">) {
  const { lang, id } = await params;
  const { locale, category, error } = await load(lang, id);
  if (!category) {
    return <BackendError dict={await getDictionary(locale)} reason={error} />;
  }
  const query = await searchParams;
  const index = await getCategoryIndex(locale).catch(() => null);
  const urlPath = index?.pathById.get(category.id);
  // Old /category/<id> links (and anything not coming through the SEO URL) move permanently.
  if (urlPath && !(await headers()).get(SEO_REWRITE_HEADER)) {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) for (const x of [v].flat()) if (x !== undefined) qs.append(k, x);
    permanentRedirect(`${categoryHref(locale, { id: category.id, path: urlPath })}${qs.size ? `?${qs}` : ""}`);
  }
  const selfHref = categoryHref(locale, { id: category.id, path: urlPath });
  const hrefOf = (c: { id: number }) => categoryHref(locale, { id: c.id, path: index?.pathById.get(c.id) });
  const page = Math.max(1, Number(query.page) || 1);
  const sort = parseSort(query.sort);
  const price = selectedPrice(query);
  const productsFor = (filters: Record<string, string[]>) =>
    settle(
      getCategoryProducts(locale, { categoryId: category.id, filters, price, sort, page, pageSize: PAGE_SIZE }),
      `category ${category.id} products`,
    );

  // Products don't wait for the filter list: they start with the filters in the URL,
  // and are only fetched again if one of those turns out not to be a real filter.
  const guessed = filtersFromQuery(query);
  const [dict, groups, bounds, trail, firstTry] = await Promise.all([
    getDictionary(locale),
    getFilters(locale, category.id).catch(() => []),
    getPriceBounds(locale, category.id).catch(() => null),
    getCategoryPath(locale, category.id).catch(() => []),
    productsFor(guessed),
  ]);
  const filters = selectedFilters(query, groups);
  const { value: result, error: failure } =
    sameFilters(filters, guessed) ? firstTry : await productsFor(filters);

  // Opening a product from here is the likely next step: fetch the first ones' details
  // into the cache after this response has been sent.
  if (result) after(() => warmProductPages(locale, result.items));

  // Show children; a last-level category shows its siblings so shoppers can move across.
  const children = visibleChildren(category);
  const parent = trail.length > 1 ? trail[trail.length - 2] : null;
  const subcategories = children.length > 0 || !parent ? children : visibleChildren(parent);

  return (
    <section>
      <Breadcrumbs
        locale={locale}
        trail={trail.map((c) => ({ id: c.id, name: c.name, path: c.path }))}
        labels={{ home: dict.nav.home, breadcrumb: dict.nav.breadcrumb }}
      />
      <h1 className="mb-4 text-2xl font-bold">{category.name}</h1>

      {subcategories.length > 0 && (
        <ul className="mb-6 flex flex-wrap gap-2">
          {subcategories.map((sub) => (
            <li key={sub.id}>
              <Link
                href={hrefOf(sub)}
                aria-current={sub.id === category.id ? "page" : undefined}
                className="block rounded-full border border-neutral-300 px-4 py-1 text-sm hover:border-brand hover:text-brand aria-[current=page]:border-brand aria-[current=page]:bg-brand aria-[current=page]:text-white"
              >
                {sub.name}
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="grid gap-8 lg:grid-cols-[15rem_1fr]">
        <aside>
          <FilterPanel
            groups={groups}
            selected={filters}
            price={bounds ? { ...sliderRange(bounds), selected: price } : undefined}
            locale={locale}
            clearHref={selfHref}
            dict={dict}
          />
        </aside>
        <div className="listing-results">
          {result === null ? (
            <BackendError dict={dict} reason={failure ?? ""} />
          ) : result.items.length === 0 ? (
            <p>{dict.category.empty}</p>
          ) : (
            <ProductResults
              locale={locale}
              dict={dict}
              result={result}
              page={page}
              pageSize={PAGE_SIZE}
              params={query}
              path={selfHref}
              source={{ type: "category", categoryId: category.id, filters, price }}
              sort={sort}
              toolbar={<SortSelect sort={sort} dict={dict} />}
            />
          )}
        </div>
      </div>
    </section>
  );
}
