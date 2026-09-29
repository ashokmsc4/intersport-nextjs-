import type { Locale } from "@/i18n/config";
import { productImageUrl } from "@/lib/magento/client";
import { attr } from "@/lib/magento/catalog";
import type { Product } from "@/lib/magento/types";
import { formatPrice } from "@/lib/format";

export function ProductCard({
  product,
  locale,
}: {
  product: Product;
  locale: Locale;
}) {
  const image = productImageUrl(
    attr(product.custom_attributes, "small_image") ??
      product.media_gallery_entries[0]?.file,
  );
  const brand = attr(product.custom_attributes, "vendor_name");
  const special = Number(attr(product.custom_attributes, "special_price"));
  const onSale = special > 0 && special < product.price;

  return (
    <article className="flex flex-col gap-2">
      <div className="aspect-square overflow-hidden rounded-lg bg-neutral-100">
        {image && (
          // Plain <img> until the Magento media host is confirmed for next/image.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-contain"
          />
        )}
      </div>
      {brand && (
        <p className="text-xs uppercase tracking-wide text-neutral-500">
          {brand}
        </p>
      )}
      <h2 className="line-clamp-2 text-sm font-medium">{product.name}</h2>
      <p className="text-sm">
        {onSale ? (
          <>
            <span className="font-semibold text-brand-accent">
              {formatPrice(special, locale)}
            </span>{" "}
            <s className="text-neutral-500">
              {formatPrice(product.price, locale)}
            </s>
          </>
        ) : (
          <span className="font-semibold">
            {formatPrice(product.price, locale)}
          </span>
        )}
      </p>
    </article>
  );
}
