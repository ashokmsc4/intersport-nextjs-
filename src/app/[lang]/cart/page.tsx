import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { productImageUrl } from "@/lib/magento/client";
import { getCart, HOME_DELIVERY, pickupStoreName, type Cart } from "@/lib/magento/cart";
import { formatPrice } from "@/lib/format";
import { currentCartRef } from "@/lib/shopper";
import { CartLineControls } from "@/components/cart/CartLineControls";
import { CartTotals } from "@/components/cart/CartTotals";
import { CouponForm } from "@/components/cart/CouponForm";
import { buttonClass } from "@/components/forms/Field";
import { ProductImage } from "@/components/ProductImage";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/cart">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  return { title: (await getDictionary(lang)).cart.title };
}

export default async function CartPage({ params }: PageProps<"/[lang]/cart">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);

  const ref = await currentCartRef();
  const cart: Cart | null = ref
    ? await getCart(lang, ref, { withCoupon: true }).catch((error) => {
        console.error("[cart] load failed:", error);
        return null;
      })
    : null;

  if (!cart || cart.items.length === 0) {
    return (
      <div className="py-16 text-center">
        <h1 className="mb-4 text-2xl font-bold">{dict.cart.title}</h1>
        <p className="mb-6 text-neutral-600">{dict.cart.empty}</p>
        <Link href={`/${lang}`} className={buttonClass}>
          {dict.cart.continueShopping}
        </Link>
      </div>
    );
  }

  const totals = cart.totals;
  const subtotal = Number(totals?.sub_total ?? 0);
  const afterDiscount = Number(totals?.subtotal_with_discount ?? subtotal);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">{dict.cart.title}</h1>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <ul className="divide-y divide-neutral-200 border-y border-neutral-200">
          {cart.items.map((item) => {
            const image = productImageUrl(item.image);
            const attrs = item.cart_custom_attributes ?? [];
            const size = attrs.find((a) => a.attribute_code === "size")?.label;
            const color = attrs.find((a) => a.attribute_code === "color")?.label;
            const price = Number(item.price);
            const final = Number(item.final_price);
            const lineTotal = (
              <>
                <p className="font-semibold">{formatPrice(final * Number(item.qty), lang)}</p>
                {final < price && (
                  <s className="text-neutral-500">{formatPrice(price * Number(item.qty), lang)}</s>
                )}
              </>
            );
            return (
              <li key={item.item_id} className="flex gap-3 py-4 sm:gap-4">
                <ProductImage src={image} alt="" sizes="96px" className="size-20 shrink-0 rounded sm:size-24" />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  {item.brand && (
                    <p className="text-xs uppercase tracking-wide text-neutral-500">
                      {item.brand}
                    </p>
                  )}
                  <p className="font-medium">{item.name}</p>
                  {/* Phones: the line total sits under the name. */}
                  <div className="flex flex-wrap items-baseline gap-x-2 text-sm sm:hidden">{lineTotal}</div>
                  <p className="text-sm text-neutral-600">
                    {[
                      size && size !== "One Size" && `${dict.cart.size}: ${size}`,
                      color && `${dict.cart.color}: ${color}`,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  {pickupStoreName(item) && (
                    <p className="text-sm text-brand">
                      {dict.delivery.pickupFrom.replace("{store}", pickupStoreName(item) ?? "")}
                    </p>
                  )}
                  <CartLineControls
                    locale={lang}
                    itemId={item.item_id}
                    sku={item.sku}
                    sourceCode={String(item.source_code ?? HOME_DELIVERY)}
                    qty={Number(item.qty)}
                    maxQty={Number(item.remaining_qty ?? 10)}
                    dict={{ cart: dict.cart, product: dict.product, errors: dict.errors }}
                  />
                </div>
                <div className="hidden shrink-0 text-end text-sm whitespace-nowrap sm:block">{lineTotal}</div>
              </li>
            );
          })}
        </ul>

        <aside className="flex h-fit flex-col gap-4 rounded-lg border border-neutral-200 p-4">
          <CouponForm
            locale={lang}
            coupon={cart.coupon}
            dict={{ cart: dict.cart, errors: dict.errors }}
          />
          <CartTotals
            locale={lang}
            dict={dict}
            subtotal={subtotal}
            discount={afterDiscount - subtotal}
            shipping={null}
            total={Number(totals?.total ?? afterDiscount)}
          />
          <Link href={`/${lang}/checkout`} className={`${buttonClass} text-center`}>
            {dict.cart.checkout}
          </Link>
        </aside>
      </div>
    </div>
  );
}
