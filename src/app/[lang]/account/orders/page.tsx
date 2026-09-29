import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getOrders } from "@/lib/magento/customer";
import { formatPrice } from "@/lib/format";
import { formatDate, statusLabel } from "@/lib/orders";
import { requireCustomer } from "@/lib/shopper";
import { AccountNav } from "@/components/account/AccountNav";

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
  searchParams,
}: PageProps<"/[lang]/account/orders">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const { token } = await requireCustomer(lang, `/${lang}/account/orders`);
  const dict = await getDictionary(lang);
  const t = dict.orders;
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const result = await getOrders(lang, token, { page, pageSize: PAGE_SIZE });
  const totalPages = Math.ceil(result.total_count / PAGE_SIZE);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-4 text-2xl font-bold">{t.title}</h1>
      <AccountNav locale={lang} dict={dict} current="orders" />
      {result.items.length === 0 ? (
        <p className="text-neutral-600">{t.none}</p>
      ) : (
        <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200">
          {result.items.map((order) => (
            <li key={order.increment_id}>
              <Link
                href={`/${lang}/account/orders/${order.increment_id}`}
                className="flex flex-wrap items-center justify-between gap-2 p-4 text-sm hover:bg-neutral-50"
              >
                <span className="font-semibold">
                  {t.order} #{order.increment_id}
                </span>
                <span className="text-neutral-500">
                  {formatDate(order.created_at, lang)}
                </span>
                <span>{statusLabel(order.status)}</span>
                <span className="font-semibold">
                  {formatPrice(order.grand_total, lang)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {totalPages > 1 && (
        <nav className="mt-6 flex justify-center gap-4 text-sm">
          {page > 1 && <Link href={`?page=${page - 1}`}>{dict.category.previous}</Link>}
          <span>
            {page} / {totalPages}
          </span>
          {page < totalPages && <Link href={`?page=${page + 1}`}>{dict.category.next}</Link>}
        </nav>
      )}
    </div>
  );
}
