import Link from "next/link";
import type { Dictionary } from "@/i18n/dictionaries";

export function AccountNav({
  locale,
  dict,
  current,
}: {
  locale: string;
  dict: Pick<Dictionary, "account">;
  current: "overview" | "orders" | "addresses";
}) {
  const links = [
    { key: "overview", href: `/${locale}/account`, label: dict.account.overview },
    { key: "orders", href: `/${locale}/account/orders`, label: dict.account.orders },
    { key: "addresses", href: `/${locale}/account/addresses`, label: dict.account.addresses },
  ] as const;
  return (
    <nav className="mb-6 flex gap-4 border-b border-neutral-200 text-sm font-medium">
      {links.map((link) => (
        <Link
          key={link.key}
          href={link.href}
          aria-current={current === link.key ? "page" : undefined}
          className="-mb-px border-b-2 border-transparent pb-2 aria-[current=page]:border-brand aria-[current=page]:text-brand"
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
