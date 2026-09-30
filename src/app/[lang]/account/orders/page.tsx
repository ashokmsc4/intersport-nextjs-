import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getOrders } from "@/lib/magento/customer";
import { toOrderRow } from "@/lib/orders";
import { requireCustomer } from "@/lib/shopper";
import { AccountNav } from "@/components/account/AccountNav";
import { InfiniteOrders } from "@/components/account/InfiniteOrders";

const PAGE_SIZE = 10;

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/account/orders">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  return { title: (await getDictionary(lang)).orders.title };
}

export default async function OrdersPage({
  params,
}: PageProps<"/[lang]/account/orders">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const { token } = await requireCustomer(lang, `/${lang}/account/orders`);
  const dict = await getDictionary(lang);
  const t = dict.orders;
  const result = await getOrders(lang, token, { page: 1, pageSize: PAGE_SIZE });

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-4 text-2xl font-bold">{t.title}</h1>
      <AccountNav locale={lang} dict={dict} current="orders" />
      {result.items.length === 0 ? (
        <p className="text-neutral-600">{t.none}</p>
      ) : (
        <InfiniteOrders
          locale={lang}
          initial={result.items.map((o) => toOrderRow(o, lang))}
          total={result.total_count}
          pageSize={PAGE_SIZE}
          dict={dict}
        />
      )}
    </div>
  );
}
