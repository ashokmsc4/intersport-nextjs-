"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { loadListingPage, type ListingSource } from "@/app/actions/catalog";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { ProductTile, type ProductCardData } from "@/components/ProductTile";

type Saved = { products: ProductCardData[]; page: number; total: number };

// The loaded list, and (separately, set only when a product is opened) the scroll position.
const listKey = (key: string) => `plp:${key}`;
const scrollKey = (key: string) => `plp-y:${key}`;

function read<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  try {
    if (value === null) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or blocked: going back just starts from the first page.
  }
}

/**
 * Product grid that loads the next page as the shopper nears the end (infinite scroll).
 * The first page comes from the server; later pages from `loadListingPage`. The "Load more"
 * link is a plain ?page= link for crawlers and browsers without JavaScript.
 * Loaded products and the scroll position are kept for the browser's back button.
 */
export function InfiniteProducts({
  locale,
  listingKey,
  source,
  sort,
  initial,
  startPage,
  total: initialTotal,
  pageSize,
  query,
  dict,
}: {
  locale: Locale;
  /** Identifies the listing (path + filters + sort); a change starts over. */
  listingKey: string;
  source: ListingSource;
  sort: string;
  initial: ProductCardData[];
  startPage: number;
  total: number;
  pageSize: number;
  /** Current query string without `page`, for the no-JavaScript "Load more" link. */
  query: string;
  dict: Pick<Dictionary, "category">;
}) {
  type List = { products: ProductCardData[]; page: number; total: number };
  const [list, setListState] = useState<List>({ products: initial, page: startPage, total: initialTotal });
  // Mirror of `list`, updated with it, so a load always continues from the latest list.
  const listRef = useRef(list);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  // Loading waits until the back-button restore below has run.
  const [ready, setReady] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);
  const loading = useRef(false);
  const { products, page, total } = list;
  const done = page >= Math.ceil(total / pageSize);
  const t = dict.category;

  // Coming back from a product: show what was loaded before and return to the same spot.
  useEffect(() => {
    const y = read<number>(scrollKey(listingKey));
    const saved = read<Saved>(listKey(listingKey));
    if (y !== null && saved && saved.page > startPage) {
      listRef.current = saved;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restoring from sessionStorage after hydration
      setListState(saved);
    }
    if (y !== null) {
      // After the restored products have rendered.
      requestAnimationFrame(() => requestAnimationFrame(() => window.scrollTo(0, y)));
      write(scrollKey(listingKey), null);
    }
    setReady(true);
  }, [listingKey, startPage]);

  const loadMore = useCallback(async () => {
    const current = listRef.current;
    if (loading.current || current.page >= Math.ceil(current.total / pageSize)) return;
    loading.current = true;
    setStatus("loading");
    const next = current.page + 1;
    const result = await loadListingPage({ locale, source, sort, page: next, pageSize });
    loading.current = false;
    if (!result.ok) {
      setStatus("error");
      return;
    }
    const latest = listRef.current;
    const seen = new Set(latest.products.map((p) => p.sku));
    const merged = [...latest.products, ...result.products.filter((p) => !seen.has(p.sku))];
    // An empty page means the listing ended early (counts can be off by a few).
    const updated = result.products.length
      ? { products: merged, page: next, total: result.total }
      : { products: merged, page: next, total: merged.length };
    listRef.current = updated;
    setListState(updated);
    setStatus("idle");
    write(listKey(listingKey), updated);
  }, [listingKey, locale, pageSize, sort, source]);

  // Start loading well before the end of the grid is on screen.
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !ready || done || status !== "idle") return;
    const observer = new IntersectionObserver(
      (entries) => entries.some((e) => e.isIntersecting) && loadMore(),
      { rootMargin: "0px 0px 1200px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ready, done, loadMore, status]);

  // Remember where the shopper was when they open a product.
  const rememberPosition = () => {
    write(listKey(listingKey), listRef.current);
    write(scrollKey(listingKey), Math.round(window.scrollY));
  };

  return (
    <>
      <ul className="grid grid-cols-2 gap-6 sm:grid-cols-3 xl:grid-cols-4" onClickCapture={rememberPosition}>
        {products.map((product) => (
          <li key={product.sku}>
            <ProductTile product={product} locale={locale} />
          </li>
        ))}
        {status === "loading" &&
          Array.from({ length: 4 }, (_, i) => (
            <li key={`skeleton-${i}`} aria-hidden className="flex flex-col gap-2">
              <div className="aspect-square animate-pulse rounded-lg bg-neutral-100" />
              <div className="h-3 w-1/3 animate-pulse rounded bg-neutral-100" />
              <div className="h-4 w-4/5 animate-pulse rounded bg-neutral-100" />
            </li>
          ))}
      </ul>

      <div ref={sentinel} className="mt-8 flex flex-col items-center gap-3 text-sm" aria-live="polite">
        <p className="text-neutral-500">
          {t.showing.replace("{shown}", String(products.length)).replace("{total}", String(Math.max(total, products.length)))}
        </p>
        {status === "loading" && <p className="text-neutral-500">{t.loadingMore}</p>}
        {status === "error" && (
          <button type="button" onClick={loadMore} className="rounded border border-neutral-300 px-5 py-2 font-semibold">
            {t.retry}
          </button>
        )}
        {!done && status === "idle" && (
          <a
            href={`?${query ? `${query}&` : ""}page=${page + 1}`}
            onClick={(e) => {
              e.preventDefault();
              loadMore();
            }}
            className="rounded border border-neutral-300 px-5 py-2 font-semibold hover:border-brand hover:text-brand"
          >
            {t.loadMore}
          </a>
        )}
      </div>
    </>
  );
}
