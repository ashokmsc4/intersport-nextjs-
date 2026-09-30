import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getOrder } from "@/lib/magento/customer";
import { formatPrice } from "@/lib/format";
import { deliveryAddress, formatDate, statusLabel, visibleItems } from "@/lib/orders";
import { requireCustomer } from "@/lib/shopper";
import { AccountShell } from "@/components/account/AccountShell";
import { CartTotals } from "@/components/cart/CartTotals";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/account/orders/[id]">): Promise<Metadata> {
  const { lang, id } = await params;
  if (!hasLocale(lang)) return {};
  return { title: `${(await getDictionary(lang)).orders.order} #${id}` };
}

export default async function OrderPage({
  params,
}: PageProps<"/[lang]/account/orders/[id]">) {
  const { lang, id } = await params;
  if (!hasLocale(lang) || !/^[\w-]+$/.test(id)) notFound();
  const { token, customer } = await requireCustomer(lang, `/${lang}/account/orders/${id}`);
  const dict = await getDictionary(lang);
  const t = dict.orders;
  const order = await getOrder(lang, token, id);
  if (!order) notFound();
  const address = deliveryAddress(order);

  return (
    <AccountShell locale={lang} dict={dict} customer={customer} current="orders" title={`${t.order} #${order.increment_id}`}>
      <p className="mb-6 text-sm text-neutral-600">
        {formatDate(order.created_at, lang)} · {statusLabel(order.status)}
      </p>

      <section className="mb-6">
        <h2 className="mb-2 font-semibold">{t.items}</h2>
        <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white text-sm">
          {visibleItems(order).map((item) => (
            <li key={item.item_id} className="flex justify-between gap-4 p-3">
              <span>
                {item.name}
                <span className="block text-neutral-500">
                  {t.qty}: {Number(item.qty_ordered)}
                </span>
              </span>
              <span>{formatPrice(item.row_total, lang)}</span>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid gap-6 sm:grid-cols-2">
        {address && (
          <section className="text-sm">
            <h2 className="mb-2 font-semibold">{t.deliverTo}</h2>
            <p>
              {address.firstname} {address.lastname}
            </p>
            <p>{[...(address.street ?? []), address.city, address.region].filter(Boolean).join(", ")}</p>
            {address.telephone && <p dir="ltr" className="text-start">{address.telephone}</p>}
          </section>
        )}
        <section className="text-sm">
          {order.shipping_description && (
            <p className="mb-2">
              <span className="font-semibold">{t.shipping}:</span> {order.shipping_description}
            </p>
          )}
          <CartTotals
            locale={lang}
            dict={dict}
            subtotal={order.subtotal}
            discount={-Math.abs(order.discount_amount)}
            shipping={order.shipping_amount}
            total={order.grand_total}
          />
        </section>
      </div>

      <Link href={`/${lang}/account/orders`} className="mt-8 inline-block text-sm text-brand underline">
        {t.back}
      </Link>
    </AccountShell>
  );
}
