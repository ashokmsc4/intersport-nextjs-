import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { parseSort, searchProducts } from "@/lib/magento/catalog";
import { BackendError } from "@/components/BackendError";
import { FilterPanel } from "@/components/catalog/FilterPanel";
import { SortSelect } from "@/components/catalog/SortSelect";
import { settle } from "@/lib/magento/diagnose";
import { ProductResults } from "@/components/catalog/ProductResults";
import { SearchBox } from "@/components/search/SearchBox";
import { imageHosts } from "@/lib/media";

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
      <SearchBox
        // Remount per query so the field shows the query being viewed.
        key={q}
        locale={lang}
        dict={dict}
        imageHosts={imageHosts()}
        defaultValue={q}
        autoFocus={!q}
        className="mb-8 max-w-xl"
      />
      {q && (
        <div>
          {/* No filters on search yet: the form only carries q for the sort dropdown. */}
          <FilterPanel
            groups={[]}
            selected={{}}
            query={q}
            clearHref={`/${lang}/search?q=${encodeURIComponent(q)}`}
            dict={dict}
          />
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
                path={`/${lang}/search`}
                source={{ type: "search", q }}
                sort={sort}
                toolbar={<SortSelect sort={sort} dict={dict} />}
              />
            )}
          </div>
        </div>
      )}
    </section>
  );
}
