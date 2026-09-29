import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { formatPrice } from "@/lib/format";

/** Summary rows; discount and shipping only show when they apply. */
export function CartTotals({
  locale,
  dict,
  subtotal,
  discount,
  shipping,
  total,
}: {
  locale: Locale;
  dict: Pick<Dictionary, "cart">;
  subtotal: number;
  discount: number;
  shipping: number | null;
  total: number;
}) {
  const t = dict.cart;
  return (
    <dl className="grid grid-cols-[1fr_auto] gap-y-2 text-sm">
      <dt>{t.subtotal}</dt>
      <dd>{formatPrice(subtotal, locale)}</dd>
      {discount !== 0 && (
        <>
          <dt>{t.discount}</dt>
          <dd className="text-green-700">
            −{formatPrice(Math.abs(discount), locale)}
          </dd>
        </>
      )}
      {shipping !== null && (
        <>
          <dt>{t.shipping}</dt>
          <dd>{shipping > 0 ? formatPrice(shipping, locale) : t.free}</dd>
        </>
      )}
      <dt className="border-t border-neutral-200 pt-2 text-base font-bold">
        {t.total}
      </dt>
      <dd className="border-t border-neutral-200 pt-2 text-base font-bold">
        {formatPrice(total, locale)}
      </dd>
    </dl>
  );
}
