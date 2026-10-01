import { productImageUrl } from "@/lib/magento/client";
import { attr, effectivePrice, productUrlKey } from "@/lib/magento/catalog";
import type { Product, ProductDetail } from "@/lib/magento/types";
import { ProductTile, type ProductCardData } from "./ProductTile";

export type { ProductCardData };

/** Normalizes an item from `V1/mstore/products`. */
export function cardFromListItem(product: Product): ProductCardData {
  const a = product.custom_attributes;
  return {
    sku: product.sku,
    urlKey: productUrlKey(product),
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
export function cardFromDetail(product: ProductDetail, urlKey?: string | null): ProductCardData {
  return {
    sku: product.sku,
    urlKey,
    name: product.name,
    brand: product.brand,
    image: productImageUrl(product.media_gallery_entries?.[0] ?? product.image),
    price: effectivePrice(product),
  };
}

/** Product card for server components; see ProductTile. */
export const ProductCard = ProductTile;
