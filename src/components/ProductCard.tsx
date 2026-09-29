import Link from "next/link";
import type { Locale } from "@/i18n/config";
import { productImageUrl } from "@/lib/magento/client";
import { attr, effectivePrice } from "@/lib/magento/catalog";
import type { Product, ProductDetail } from "@/lib/magento/types";
import { Price } from "./Price";

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
    <Link
      href={`/${locale}/product/${encodeURIComponent(product.sku)}`}
      className="group flex flex-col gap-2"
    >
      <div className="aspect-square overflow-hidden rounded-lg bg-neutral-100">
        {product.image && (
          // Plain <img> until the Magento media host is confirmed for next/image.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-contain transition-transform group-hover:scale-105"
          />
        )}
      </div>
      {product.brand && (
        <p className="text-xs uppercase tracking-wide text-neutral-500">
          {product.brand}
        </p>
      )}
      <h2 className="line-clamp-2 text-sm font-medium group-hover:text-brand">
        {product.name}
      </h2>
      <Price {...product.price} locale={locale} className="text-sm" />
    </Link>
  );
}
