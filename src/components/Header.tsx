import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { getNavTree } from "@/lib/magento/catalog";
import { MegaMenu } from "@/components/nav/MegaMenu";
import { MobileMenu } from "@/components/nav/MobileMenu";
import { AccountButton, CartButton } from "@/components/cart/CartDrawer";
import { SearchIcon } from "@/components/icons";
import { SearchBox } from "@/components/search/SearchBox";
import { imageHosts } from "@/lib/media";

export async function Header({
  locale,
  dict,
}: {
  locale: Locale;
  dict: Dictionary;
}) {
  const otherLocale: Locale = locale === "en" ? "ar" : "en";
  // No cookies are read here, so pages can be served from the cache.
  // The account name and cart count load in the browser (CartDrawerProvider).
  const tree = await getNavTree(locale).catch(() => []);

  return (
    <header className="relative border-b border-neutral-200">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4">
        <MobileMenu
          locale={locale}
          tree={tree}
          labels={{ menu: dict.nav.menu, closeMenu: dict.nav.closeMenu, viewAll: dict.nav.viewAll }}
        />
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
        <SearchBox
          locale={locale}
          dict={dict}
          imageHosts={imageHosts()}
          className="hidden flex-1 md:flex md:max-w-md"
        />
        <nav className="flex items-center gap-2 text-sm whitespace-nowrap sm:gap-3">
          <Link
            href={`/${locale}/search`}
            aria-label={dict.nav.search}
            title={dict.nav.search}
            className="p-1 hover:text-brand md:hidden"
          >
            <SearchIcon />
          </Link>
          <AccountButton
            locale={locale}
            labels={{ login: dict.nav.login, account: dict.nav.account, hello: dict.nav.hello }}
          />
          <CartButton locale={locale} label={dict.nav.cart} />
          <Link
            href={`/${otherLocale}`}
            hrefLang={otherLocale}
            className="rounded border border-neutral-300 px-2 py-1 text-xs font-semibold hover:border-brand hover:text-brand"
          >
            {dict.nav.switchLanguage}
          </Link>
        </nav>
      </div>
      <MegaMenu
        locale={locale}
        tree={tree}
        labels={{ categories: dict.nav.categories, viewAll: dict.nav.viewAll }}
      />
    </header>
  );
}
