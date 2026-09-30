import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireCustomer } from "@/lib/shopper";
import { AccountShell } from "@/components/account/AccountShell";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/account/wishlist">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  return { title: (await getDictionary(lang)).account.wishlist };
}

export default async function WishlistPage({
  params,
}: PageProps<"/[lang]/account/wishlist">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const { customer } = await requireCustomer(lang, `/${lang}/account/wishlist`);
  const dict = await getDictionary(lang);

  return (
    <AccountShell locale={lang} dict={dict} customer={customer} current="wishlist" title={dict.account.wishlist}>
      <div className="rounded-lg bg-white p-5 text-sm">
        <p className="mb-4 text-neutral-600">{dict.account.wishlistEmpty}</p>
        <Link href={`/${lang}`} className="font-medium text-brand hover:underline">
          {dict.cart.continueShopping}
        </Link>
      </div>
    </AccountShell>
  );
}
