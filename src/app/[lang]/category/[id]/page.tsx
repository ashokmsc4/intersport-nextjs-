import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { hasLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import {
  getCategory,
  getCategoryProducts,
  visibleChildren,
} from "@/lib/magento/catalog";
import { ProductCard } from "@/components/ProductCard";

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
  const dict = await getDictionary(locale);

  const pageParam = (await searchParams).page;
  const page = Math.max(1, Number(pageParam) || 1);
  const result = await getCategoryProducts(locale, {
    categoryId: category.id,
    page,
    pageSize: PAGE_SIZE,
  }).catch((error) => {
    console.error(`[magento] category ${category.id} products:`, error);
    return null;
  });
  const totalPages = result ? Math.ceil(result.total_count / PAGE_SIZE) : 0;
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

      {result === null ? (
        <p className="rounded border border-amber-300 bg-amber-50 p-4 text-amber-900">
          {dict.home.backendUnavailable}
        </p>
      ) : result.items.length === 0 ? (
        <p>{dict.category.empty}</p>
      ) : (
        <>
          <p className="mb-4 text-sm text-neutral-500">
            {dict.category.results.replace("{count}", String(result.total_count))}
          </p>
          <ul className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
            {result.items.map((product) => (
              <li key={product.id}>
                <ProductCard product={product} locale={locale} />
              </li>
            ))}
          </ul>
          {totalPages > 1 && (
            <nav className="mt-8 flex items-center justify-center gap-4 text-sm">
              {page > 1 && (
                <Link href={`?page=${page - 1}`}>{dict.category.previous}</Link>
              )}
              <span>
                {page} / {totalPages}
              </span>
              {page < totalPages && (
                <Link href={`?page=${page + 1}`}>{dict.category.next}</Link>
              )}
            </nav>
          )}
        </>
      )}
    </section>
  );
}
