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
        <Link href={`/${locale}`} className="text-xl font-extrabold text-brand">
          {dict.site.name}
        </Link>
        <nav className="flex items-center gap-4 text-sm">
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
