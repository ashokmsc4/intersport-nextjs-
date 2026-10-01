import Link from "next/link";
import type { ReactNode } from "react";
import type { Dictionary } from "@/i18n/dictionaries";
import { logoutAction } from "@/app/actions/auth";
import {
  GearIcon,
  HeartIcon,
  LogoutIcon,
  PackageIcon,
  PinIcon,
  UserIcon,
} from "@/components/icons";

export type AccountSection = "dashboard" | "orders" | "wishlist" | "addresses" | "settings";

export function accountLinks(locale: string, t: Dictionary["account"]) {
  return [
    { key: "orders", href: `/${locale}/account/orders`, label: t.orders, hint: t.ordersHint, Icon: PackageIcon, tone: "bg-neutral-200 text-neutral-900" },
    { key: "wishlist", href: `/${locale}/account/wishlist`, label: t.wishlist, hint: t.wishlistHint, Icon: HeartIcon, tone: "bg-neutral-100 text-pink-500" },
    { key: "addresses", href: `/${locale}/account/addresses`, label: t.myAddresses, hint: t.addressesHint, Icon: PinIcon, tone: "bg-neutral-100 text-orange-500" },
    { key: "settings", href: `/${locale}/account/settings`, label: t.settings, hint: t.settingsHint, Icon: GearIcon, tone: "bg-neutral-100 text-neutral-500" },
  ] as const;
}

/** My Account frame: breadcrumb, profile sidebar with section links and sign-out, and the page content. */
export function AccountShell({
  locale,
  dict,
  customer,
  current,
  title,
  children,
}: {
  locale: string;
  dict: Pick<Dictionary, "account" | "nav">;
  customer: { firstname: string; lastname: string; email: string };
  current: AccountSection;
  title: string;
  children: ReactNode;
}) {
  const t = dict.account;
  const links = accountLinks(locale, t);
  const section = links.find((link) => link.key === current);
  const name = `${customer.firstname} ${customer.lastname}`;

  return (
    <div className="-my-8 bg-[#efefef] py-6 sm:py-8 shadow-[0_0_0_100vmax_#efefef] [clip-path:inset(0_-100vmax)]">
      <nav aria-label={dict.nav.breadcrumb} className="mb-4 text-sm text-neutral-500 sm:mb-6">
        <ol className="flex flex-wrap items-center gap-2">
          <li>
            <Link href={`/${locale}`} className="hover:text-brand">
              {dict.nav.home}
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li>
            {section ? (
              <Link href={`/${locale}/account`} className="hover:text-brand">
                {t.myAccount}
              </Link>
            ) : (
              <span aria-current="page" className="text-neutral-900">{t.myAccount}</span>
            )}
          </li>
          {section && (
            <>
              <li aria-hidden>/</li>
              <li aria-current="page" className="text-neutral-900">{section.label}</li>
            </>
          )}
        </ol>
      </nav>

      {/* Phones, on a section page: section tabs instead of the full sidebar. */}
      {section && (
        <nav aria-label={t.accountMenu} className="-mx-4 mb-5 md:hidden">
          <ul className="flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {links.map(({ key, href, label, Icon }) => (
              <li key={key} className="shrink-0">
                <Link
                  href={href}
                  aria-current={current === key ? "page" : undefined}
                  className="flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3.5 py-2 text-sm whitespace-nowrap text-neutral-700 aria-[current=page]:border-brand aria-[current=page]:bg-brand aria-[current=page]:text-white [&_svg]:size-4"
                >
                  <Icon />
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 md:grid-cols-[16rem_minmax(0,1fr)] md:gap-8">
        <aside className={`rounded-lg bg-white ${section ? "max-md:hidden" : ""}`}>
          <div className="flex items-center gap-3 border-b border-neutral-100 p-5">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-neutral-200 [&_svg]:size-5">
              <UserIcon />
            </span>
            <div className="min-w-0">
              <p dir="auto" className="truncate text-sm font-semibold">{name}</p>
              <p className="truncate text-xs text-neutral-500">{customer.email}</p>
            </div>
          </div>
          <nav aria-label={t.accountMenu} className="p-2">
            <ul>
              {links.map(({ key, href, label, Icon }) => (
                <li key={key}>
                  <Link
                    href={href}
                    aria-current={current === key ? "page" : undefined}
                    className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 aria-[current=page]:bg-neutral-100 aria-[current=page]:font-medium aria-[current=page]:text-brand [&_svg]:size-4"
                  >
                    <Icon />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
            <form action={logoutAction} className="mt-2 border-t border-neutral-100 pt-2">
              <input type="hidden" name="locale" value={locale} />
              <button
                type="submit"
                className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 [&_svg]:size-4 rtl:[&_svg]:rotate-180"
              >
                <LogoutIcon />
                {dict.nav.logout}
              </button>
            </form>
          </nav>
        </aside>

        <div className="min-w-0">
          <h1 className="mb-4 text-2xl font-bold sm:mb-6">{title}</h1>
          {children}
        </div>
      </div>
    </div>
  );
}
