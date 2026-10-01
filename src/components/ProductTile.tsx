import type { Locale } from "@/i18n/config";
import { Price } from "./Price";
import { ProductImage } from "./ProductImage";
import Link from "next/link";
import { productHref } from "@/lib/urls";

/** What a product card shows; built on the server (see ProductCard), rendered anywhere. */
export type ProductCardData = {
  sku: string;
  /** For the SEO URL; without it the link goes through /product/<sku> (redirects). */
  urlKey?: string | null;
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
  const { price, final, onSale } = product.price;
  // Sale badge from the list and sale prices (small rounding differences are ignored).
  const off = onSale && price > 0 ? Math.round((1 - final / price) * 100) : 0;
  return (
    <Link
      href={productHref(locale, product)}
      // Prefetched when visible: product pages stream, so this loads only their
      // loading skeleton, and a tap shows it at once.
      className="group flex flex-col gap-2"
    >
      <div className="relative">
        <ProductImage
          src={product.image}
          alt={product.name}
          sizes="(min-width: 1280px) 20vw, (min-width: 640px) 30vw, 50vw"
          className="aspect-square rounded-lg [&_img]:transition-transform [&_img]:duration-500 group-hover:[&_img]:scale-105"
        />
        {off >= 5 && (
          <span dir="ltr" className="absolute start-2 top-2 rounded bg-brand-accent px-1.5 py-0.5 text-[11px] font-bold text-white">
            −{off}%
          </span>
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
