import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";

export function Header({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const otherLocale: Locale = locale === "en" ? "ar" : "en";

  return (
    <header className="border-b border-neutral-200">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4">
        <Link href={`/${locale}`} className="text-xl font-extrabold text-brand">
          {dict.site.name}
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href={`/${locale}/search`}>{dict.nav.search}</Link>
          <Link href={`/${locale}/account`}>{dict.nav.account}</Link>
          <Link href={`/${locale}/cart`}>{dict.nav.cart}</Link>
          <Link href={`/${otherLocale}`} hrefLang={otherLocale}>
            {dict.nav.switchLanguage}
          </Link>
        </nav>
      </div>
    </header>
  );
}
