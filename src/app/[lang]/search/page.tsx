import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { parseSort, searchProducts } from "@/lib/magento/catalog";
import { BackendError } from "@/components/BackendError";
import { FilterPanel } from "@/components/catalog/FilterPanel";
import { settle } from "@/lib/magento/diagnose";
import { ProductResults } from "@/components/catalog/ProductResults";

const PAGE_SIZE = 24;

const queryOf = (value: string | string[] | undefined) =>
  (Array.isArray(value) ? value[0] : (value ?? "")).trim().slice(0, 100);

export async function generateMetadata({
  params,
  searchParams,
}: PageProps<"/[lang]/search">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const q = queryOf((await searchParams).q);
  const dict = await getDictionary(lang);
  return {
    title: q ? dict.search.resultsFor.replace("{q}", q) : dict.search.title,
    robots: { index: false },
  };
}

export default async function SearchPage({
  params,
  searchParams,
}: PageProps<"/[lang]/search">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const query = await searchParams;
  const dict = await getDictionary(lang);
  const q = queryOf(query.q);
  const page = Math.max(1, Number(query.page) || 1);
  const sort = parseSort(query.sort);

  const { value: result, error: failure } = q
    ? await settle(searchProducts(lang, q, { sort, page, pageSize: PAGE_SIZE }), "search")
    : { value: null, error: null };

  return (
    <section>
      <h1 className="mb-6 text-2xl font-bold">
        {q ? dict.search.resultsFor.replace("{q}", q) : dict.search.prompt}
      </h1>
      <form role="search" className="mb-8 flex max-w-xl">
        <input
          type="search"
          name="q"
          defaultValue={q}
          aria-label={dict.nav.searchPlaceholder}
          placeholder={dict.nav.searchPlaceholder}
          className="w-full rounded-s border border-neutral-300 px-3 py-2"
        />
        <button type="submit" className="rounded-e bg-brand px-4 font-semibold text-white">
          {dict.nav.searchButton}
        </button>
      </form>
      {q && (
        <div className="grid gap-8 lg:grid-cols-[15rem_1fr]">
          <aside>
            <FilterPanel
              groups={[]}
              selected={{}}
              sort={sort}
              query={q}
              clearHref={`/${lang}/search?q=${encodeURIComponent(q)}`}
              dict={dict}
            />
          </aside>
          <div>
            {result === null ? (
              <BackendError dict={dict} reason={failure ?? ""} />
            ) : result.items.length === 0 ? (
              <p>{dict.search.noResults.replace("{q}", q)}</p>
            ) : (
              <ProductResults
                locale={lang}
                dict={dict}
                result={result}
                page={page}
                pageSize={PAGE_SIZE}
                params={query}
              />
            )}
          </div>
        </div>
      )}
    </section>
  );
}
