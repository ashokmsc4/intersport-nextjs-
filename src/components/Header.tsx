import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { getMenuCategories } from "@/lib/magento/catalog";
import { getCartCount, getCustomerName } from "@/lib/session";

export async function Header({
  locale,
  dict,
}: {
  locale: Locale;
  dict: Dictionary;
}) {
  const otherLocale: Locale = locale === "en" ? "ar" : "en";
  const [name, count, categories] = await Promise.all([
    getCustomerName(),
    getCartCount(),
    getMenuCategories(locale).catch(() => []),
  ]);

  return (
    <header className="border-b border-neutral-200">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4">
        <Link href={`/${locale}`} className="shrink-0">
          {/* Official Intersport logo, from the Magento theme (images/logo.svg). */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/intersport-logo.svg"
            alt={dict.site.name}
            width={170}
            height={18}
            className="h-auto w-32 sm:w-44"
          />
        </Link>
        <form
          action={`/${locale}/search`}
          role="search"
          className="hidden flex-1 md:flex md:max-w-md"
        >
          <input
            type="search"
            name="q"
            aria-label={dict.nav.searchPlaceholder}
            placeholder={dict.nav.searchPlaceholder}
            className="w-full rounded-s border border-neutral-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded-e bg-brand px-4 text-sm font-semibold text-white"
          >
            {dict.nav.searchButton}
          </button>
        </form>
        <nav className="flex items-center gap-3 text-sm whitespace-nowrap sm:gap-4">
          <Link href={`/${locale}/search`} className="md:hidden">
            {dict.nav.search}
          </Link>
          <Link href={name ? `/${locale}/account` : `/${locale}/account/login`}>
            {name ? dict.nav.hello.replace("{name}", name) : dict.nav.login}
          </Link>
          <Link href={`/${locale}/cart`} className="relative font-medium">
            {dict.nav.cart}
            {count > 0 && (
              <span className="ms-1 rounded-full bg-brand-accent px-2 py-0.5 text-xs text-white">
                {count}
              </span>
            )}
          </Link>
          <Link href={`/${otherLocale}`} hrefLang={otherLocale}>
            {dict.nav.switchLanguage}
          </Link>
        </nav>
      </div>
      {categories.length > 0 && (
        <nav className="mx-auto max-w-7xl overflow-x-auto px-4">
          <ul className="flex gap-6 pb-3 text-sm font-semibold uppercase tracking-wide whitespace-nowrap">
            {categories.map((category) => (
              <li key={category.id}>
                <Link
                  href={`/${locale}/category/${category.id}`}
                  className="hover:text-brand"
                >
                  {category.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}
