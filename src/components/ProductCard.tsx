import type { Locale } from "@/i18n/config";
import { productImageUrl } from "@/lib/magento/client";
import { attr, effectivePrice } from "@/lib/magento/catalog";
import type { Product, ProductDetail } from "@/lib/magento/types";
import { Price } from "./Price";
import { ProductImage } from "./ProductImage";
import { HoverPrefetchLink } from "./HoverPrefetchLink";

export type ProductCardData = {
  sku: string;
  name: string;
  brand?: string | null;
  image: string | null;
  price: ReturnType<typeof effectivePrice>;
};

/** Normalizes an item from `V1/mstore/products`. */
export function cardFromListItem(product: Product): ProductCardData {
  const a = product.custom_attributes;
  return {
    sku: product.sku,
    name: product.name,
    brand: attr(a, "vendor_name"),
    image: productImageUrl(
      attr(a, "small_image") ?? product.media_gallery_entries[0]?.file,
    ),
    price: effectivePrice({
      // Configurable products list with price 0; minimal_price is the real one.
      price: product.price || Number(attr(a, "minimal_price") ?? 0),
      special_price: attr(a, "special_price"),
      special_from_date: attr(a, "special_from_date"),
      special_to_date: attr(a, "special_to_date"),
    }),
  };
}

/** Normalizes an item from `V1/aaw/productdetail` or recommendations. */
export function cardFromDetail(product: ProductDetail): ProductCardData {
  return {
    sku: product.sku,
    name: product.name,
    brand: product.brand,
    image: productImageUrl(product.media_gallery_entries?.[0] ?? product.image),
    price: effectivePrice(product),
  };
}

export function ProductCard({
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
