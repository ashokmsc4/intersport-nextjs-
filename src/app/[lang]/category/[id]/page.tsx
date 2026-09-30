import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { hasLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import {
  getCategory,
  getCategoryPath,
  getCategoryProducts,
  getFilters,
  parseSort,
  selectedFilters,
  visibleChildren,
} from "@/lib/magento/catalog";
import { BackendError } from "@/components/BackendError";
import { FilterPanel } from "@/components/catalog/FilterPanel";
import { SortSelect } from "@/components/catalog/SortSelect";
import { Breadcrumbs } from "@/components/nav/Breadcrumbs";
import { settle } from "@/lib/magento/diagnose";
import { ProductResults } from "@/components/catalog/ProductResults";

const PAGE_SIZE = 24;

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
  return category ? { title: category.name } : {};
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
  const [dict, groups, trail] = await Promise.all([
    getDictionary(locale),
    getFilters(locale, category.id).catch(() => []),
    getCategoryPath(locale, category.id).catch(() => []),
  ]);

  const page = Math.max(1, Number(query.page) || 1);
  const sort = parseSort(query.sort);
  const filters = selectedFilters(query, groups);
  const { value: result, error: failure } = await settle(
    getCategoryProducts(locale, {
      categoryId: category.id,
      filters,
      sort,
      page,
      pageSize: PAGE_SIZE,
    }),
    `category ${category.id} products`,
  );
  // Show children; a last-level category shows its siblings so shoppers can move across.
  const children = visibleChildren(category);
  const parent = trail.length > 1 ? trail[trail.length - 2] : null;
  const subcategories = children.length > 0 || !parent ? children : visibleChildren(parent);

  return (
    <section>
      <Breadcrumbs
        locale={locale}
        trail={trail.map((c) => ({ id: c.id, name: c.name }))}
        labels={{ home: dict.nav.home, breadcrumb: dict.nav.breadcrumb }}
      />
      <h1 className="mb-4 text-2xl font-bold">{category.name}</h1>

      {subcategories.length > 0 && (
        <ul className="mb-6 flex flex-wrap gap-2">
          {subcategories.map((sub) => (
            <li key={sub.id}>
              <Link
                href={`/${locale}/category/${sub.id}`}
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
            clearHref={`/${locale}/category/${category.id}`}
            dict={dict}
          />
        </aside>
        <div>
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
              path={`/${locale}/category/${category.id}`}
              source={{ type: "category", categoryId: category.id, filters }}
              sort={sort}
              toolbar={<SortSelect sort={sort} dict={dict} />}
            />
          )}
        </div>
      </div>
    </section>
  );
}
