"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useRef, useState } from "react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Suggestions } from "@/lib/magento/suggest";
import { ProductImage } from "@/components/ProductImage";
import { Price } from "@/components/Price";
import { SearchIcon } from "@/components/icons";

const MIN_CHARS = 2;
const DEBOUNCE_MS = 200;

type Option = { key: string; href: string };

/**
 * Search field with suggestions while typing (products and categories from
 * /api/suggest). Works as a plain search form without JavaScript.
 */
export function SearchBox({
  locale,
  dict,
  imageHosts,
  defaultValue = "",
  autoFocus = false,
  className = "",
}: {
  locale: Locale;
  dict: Pick<Dictionary, "nav" | "search">;
  /** Hosts served through the image optimizer (see lib/media). */
  imageHosts: string[];
  defaultValue?: string;
  autoFocus?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const id = useId();
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ q: string; data: Suggestions } | null>(null);
  const [active, setActive] = useState(-1);
  const cache = useRef(new Map<string, Suggestions>());
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const latest = useRef("");

  const searchHref = (q: string) => `/${locale}/search?q=${encodeURIComponent(q)}`;

  const show = (q: string, data: Suggestions) => {
    setResult({ q, data });
    setActive(-1);
    setLoading(false);
  };

  const fetchSuggestions = (raw: string) => {
    const q = raw.trim().replace(/\s+/g, " ");
    latest.current = q;
    clearTimeout(timer.current);
    if (q.length < MIN_CHARS) {
      setResult(null);
      setLoading(false);
      return;
    }
    const cached = cache.current.get(q.toLowerCase());
    if (cached) return show(q, cached);
    setLoading(true);
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/suggest?lang=${locale}&q=${encodeURIComponent(q)}`);
        const data = (await res.json()) as Suggestions;
        cache.current.set(q.toLowerCase(), data);
        // Ignore answers to queries the shopper has already typed past.
        if (latest.current === q) show(q, data);
      } catch {
        if (latest.current === q) setLoading(false);
      }
    }, DEBOUNCE_MS);
  };

  const data = result?.data;
  const options: Option[] = [
    ...(data?.categories ?? []).map((c) => ({ key: `c${c.id}`, href: `/${locale}/category/${c.id}` })),
    ...(data?.products ?? []).map((p) => ({
      key: `p${p.sku}`,
      href: `/${locale}/product/${encodeURIComponent(p.sku)}`,
    })),
  ];
  if (result) options.push({ key: "all", href: searchHref(result.q) });
  const optionId = (key: string) => `${id}-${key}`;
  const expanded = open && value.trim().length >= MIN_CHARS && (Boolean(result) || loading);

  const close = () => {
    setOpen(false);
    setActive(-1);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      if (expanded) {
        e.preventDefault();
        close();
      }
      return;
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (!options.length) return;
      e.preventDefault();
      setOpen(true);
      const step = e.key === "ArrowDown" ? 1 : -1;
      // Cycle through the options and back to the text field (-1).
      const n = options.length + 1;
      setActive((i) => ((i + 1 + step + n) % n) - 1);
      return;
    }
    if (e.key === "Enter" && expanded && active >= 0 && options[active]) {
      e.preventDefault();
      router.push(options[active].href);
      close();
    }
  };

  const optimized = (src: string | null) => {
    try {
      return src ? imageHosts.includes(new URL(src).hostname) : false;
    } catch {
      return false;
    }
  };
  const optionClass = (key: string) =>
    `flex items-center gap-3 px-3 py-2 ${options[active]?.key === key ? "bg-neutral-100" : "hover:bg-neutral-50"}`;
  const s = dict.search;

  return (
    <form
      action={`/${locale}/search`}
      role="search"
      className={`relative flex ${className}`}
      onSubmit={(e) => {
        if (!value.trim()) e.preventDefault();
        close();
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) close();
      }}
    >
      <input
        type="search"
        name="q"
        value={value}
        autoFocus={autoFocus}
        autoComplete="off"
        role="combobox"
        aria-label={dict.nav.searchPlaceholder}
        aria-expanded={expanded}
        aria-controls={`${id}-list`}
        aria-autocomplete="list"
        aria-activedescendant={expanded && options[active] ? optionId(options[active].key) : undefined}
        placeholder={dict.nav.searchPlaceholder}
        onChange={(e) => {
          setValue(e.target.value);
          setOpen(true);
          fetchSuggestions(e.target.value);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        className="w-full rounded-s border border-neutral-300 px-3 py-2 text-sm"
      />
      <button
        type="submit"
        aria-label={dict.nav.searchButton}
        title={dict.nav.searchButton}
        className="rounded-e bg-brand px-3 text-white"
      >
        <SearchIcon />
      </button>

      {expanded && (
        <div
          className="absolute inset-x-0 top-full z-40 mt-1 max-h-[75vh] overflow-y-auto rounded border border-neutral-200 bg-white text-sm shadow-lg md:min-w-[28rem]"
          aria-busy={loading}
        >
          <ul id={`${id}-list`} role="listbox" aria-label={dict.nav.searchPlaceholder}>
            {data && data.categories.length > 0 && (
              <li role="presentation" className="px-3 pt-3 pb-1 text-xs font-semibold uppercase text-neutral-500">
                {s.suggestCategories}
              </li>
            )}
            {data?.categories.map((c) => (
              <li key={c.id} id={optionId(`c${c.id}`)} role="option" aria-selected={options[active]?.key === `c${c.id}`}>
                <Link href={`/${locale}/category/${c.id}`} prefetch={false} onClick={close} className={optionClass(`c${c.id}`)}>
                  <span className="font-medium">{c.name}</span>
                  {c.path && <span className="text-xs text-neutral-500">{c.path}</span>}
                </Link>
              </li>
            ))}
            {data && data.products.length > 0 && (
              <li role="presentation" className="px-3 pt-3 pb-1 text-xs font-semibold uppercase text-neutral-500">
                {s.suggestProducts}
              </li>
            )}
            {data?.products.map((p) => {
              const key = `p${p.sku}`;
              return (
                <li key={key} id={optionId(key)} role="option" aria-selected={options[active]?.key === key}>
                  <Link
                    href={`/${locale}/product/${encodeURIComponent(p.sku)}`}
                    prefetch={false}
                    onClick={close}
                    onMouseEnter={() => router.prefetch(`/${locale}/product/${encodeURIComponent(p.sku)}`)}
                    className={optionClass(key)}
                  >
                    <ProductImage src={p.image} alt="" sizes="48px" optimized={optimized(p.image)} className="size-12 shrink-0 rounded" />
                    <span className="flex min-w-0 flex-1 flex-col">
                      {p.brand && <span className="text-xs uppercase text-neutral-500">{p.brand}</span>}
                      <span className="truncate">{p.name}</span>
                    </span>
                    <Price {...p.price} locale={locale} className="shrink-0 text-end text-xs" />
                  </Link>
                </li>
              );
            })}
            {result && (
              <li id={optionId("all")} role="option" aria-selected={options[active]?.key === "all"}>
                <Link
                  href={searchHref(result.q)}
                  prefetch={false}
                  onClick={close}
                  className={`${optionClass("all")} border-t border-neutral-200 font-semibold text-brand`}
                >
                  {data && data.total > 0
                    ? s.viewAllResults.replace("{count}", String(data.total))
                    : s.viewResultsFor.replace("{q}", result.q)}
                </Link>
              </li>
            )}
          </ul>
          {loading && !result && <p className="px-3 py-3 text-neutral-500">{s.searching}</p>}
          {result && !loading && data && data.total === 0 && data.categories.length === 0 && (
            <p className="px-3 py-2 text-neutral-500">{s.noSuggestions.replace("{q}", result.q)}</p>
          )}
        </div>
      )}
    </form>
  );
}
