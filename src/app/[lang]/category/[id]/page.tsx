import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { hasLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import {
  getCategory,
  getCategoryProducts,
  getFilters,
  parseSort,
  selectedFilters,
  visibleChildren,
} from "@/lib/magento/catalog";
import { FilterPanel } from "@/components/catalog/FilterPanel";
import { ProductResults } from "@/components/catalog/ProductResults";

const PAGE_SIZE = 24;

async function load(lang: string, id: string) {
  const categoryId = Number(id);
  if (!hasLocale(lang) || !Number.isInteger(categoryId)) notFound();
  const category = await getCategory(lang, categoryId);
  if (!category) notFound();
  return { locale: lang as Locale, category };
}

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/category/[id]">): Promise<Metadata> {
  const { lang, id } = await params;
  const { category } = await load(lang, id);
  return { title: category.name };
}

export default async function CategoryPage({
  params,
  searchParams,
}: PageProps<"/[lang]/category/[id]">) {
  const { lang, id } = await params;
  const { locale, category } = await load(lang, id);
  const query = await searchParams;
  const [dict, groups] = await Promise.all([
    getDictionary(locale),
    getFilters(locale, category.id).catch(() => []),
  ]);

  const page = Math.max(1, Number(query.page) || 1);
  const sort = parseSort(query.sort);
  const filters = selectedFilters(query, groups);
  const result = await getCategoryProducts(locale, {
    categoryId: category.id,
    filters,
    sort,
    page,
    pageSize: PAGE_SIZE,
  }).catch((error) => {
    console.error(`[magento] category ${category.id} products:`, error);
    return null;
  });
  const subcategories = visibleChildren(category);

  return (
    <section>
      <h1 className="mb-4 text-2xl font-bold">{category.name}</h1>

      {subcategories.length > 0 && (
        <ul className="mb-6 flex flex-wrap gap-2">
          {subcategories.map((sub) => (
            <li key={sub.id}>
              <Link
                href={`/${locale}/category/${sub.id}`}
                className="block rounded-full border border-neutral-300 px-4 py-1 text-sm hover:border-brand hover:text-brand"
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
            sort={sort}
            clearHref={`/${locale}/category/${category.id}`}
            dict={dict}
          />
        </aside>
        <div>
          {result === null ? (
            <p className="rounded border border-amber-300 bg-amber-50 p-4 text-amber-900">
              {dict.home.backendUnavailable}
            </p>
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
            />
          )}
        </div>
      </div>
    </section>
  );
}
