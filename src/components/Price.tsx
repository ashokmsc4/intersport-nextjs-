import type { Locale } from "@/i18n/config";
import { formatPrice } from "@/lib/format";

export function Price({
  price,
  final,
  onSale,
  locale,
  className = "",
}: {
  price: number;
  final: number;
  onSale: boolean;
  locale: Locale;
  className?: string;
}) {
  if (!onSale) {
    return (
      <p className={className}>
        <span className="font-semibold">{formatPrice(price, locale)}</span>
      </p>
    );
  }
  return (
    <p className={className}>
      <span className="font-semibold text-brand-accent">
        {formatPrice(final, locale)}
      </span>{" "}
      <s className="text-neutral-500">{formatPrice(price, locale)}</s>
    </p>
  );
}
