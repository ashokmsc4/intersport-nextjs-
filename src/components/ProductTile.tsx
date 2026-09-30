import type { Locale } from "@/i18n/config";
import { Price } from "./Price";
import { ProductImage } from "./ProductImage";
import { HoverPrefetchLink } from "./HoverPrefetchLink";

/** What a product card shows; built on the server (see ProductCard), rendered anywhere. */
export type ProductCardData = {
  sku: string;
  name: string;
  brand?: string | null;
  image: string | null;
  price: { price: number; final: number; onSale: boolean };
};

export function ProductTile({
  product,
  locale,
}: {
  product: ProductCardData;
  locale: Locale;
}) {
  return (
    <HoverPrefetchLink
      href={`/${locale}/product/${encodeURIComponent(product.sku)}`}
      // Product pages are cached (ISR); prefetch on hover so the click is instant.
      className="group flex flex-col gap-2"
    >
      <ProductImage
        src={product.image}
        alt={product.name}
        sizes="(min-width: 1280px) 20vw, (min-width: 640px) 30vw, 50vw"
        className="aspect-square rounded-lg transition-transform group-hover:[&_img]:scale-105"
      />
      {product.brand && (
        <p className="text-xs uppercase tracking-wide text-neutral-500">
          {product.brand}
        </p>
      )}
      <h2 className="line-clamp-2 text-sm font-medium group-hover:text-brand">
        {product.name}
      </h2>
      <Price {...product.price} locale={locale} className="text-sm" />
    </HoverPrefetchLink>
  );
}
