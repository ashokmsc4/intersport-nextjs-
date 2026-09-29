import type { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";
import { hasLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { MagentoError, productImageUrl } from "@/lib/magento/client";
import {
  effectivePrice,
  getProductDetail,
  getRecommendations,
} from "@/lib/magento/catalog";
import type { ProductDetail } from "@/lib/magento/types";
import { Price } from "@/components/Price";
import { ProductCard, cardFromDetail } from "@/components/ProductCard";

const loadProduct = cache(async (lang: string, sku: string) => {
  if (!hasLocale(lang) || !sku) notFound();
  const product = await getProductDetail(lang, sku).catch((error) => {
    if (error instanceof MagentoError && error.status === 404) return null;
    throw error;
  });
  if (!product) notFound();
  return { locale: lang as Locale, product };
});

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/product/[sku]">): Promise<Metadata> {
  const { lang, sku } = await params;
  const { product } = await loadProduct(lang, decodeURIComponent(sku));
  const image = productImageUrl(
    product.media_gallery_entries?.[0] ?? product.image,
  );
  return {
    title:
      product.brand && !product.name.startsWith(product.brand)
        ? `${product.brand} ${product.name}`
        : product.name,
    openGraph: image ? { images: [image] } : undefined,
  };
}

const isAvailable = (p: ProductDetail) =>
  p.item_is_salable && (p.stock === undefined || p.stock > 0);

function option(product: ProductDetail, code: string) {
  return product.custom_attributes.find((a) => a.attribute_code === code);
}

type SizeOption = {
  sku: string;
  label: string;
  position: number;
  available: boolean;
};

function sizeOptions(product: ProductDetail): SizeOption[] {
  return (product.childrens ?? [])
    .map((child) => {
      const size = option(child, "size");
      return {
        sku: child.sku,
        label: size?.label || child.sku,
        position: Number(size?.position ?? 0),
        available: isAvailable(child),
      };
    })
    .sort((a, b) => a.position - b.position);
}

export default async function ProductPage({
  params,
}: PageProps<"/[lang]/product/[sku]">) {
  const { lang, sku } = await params;
  const { locale, product } = await loadProduct(lang, decodeURIComponent(sku));
  const dict = await getDictionary(locale);

  const recommendations = await getRecommendations(locale, product.sku).catch(
    () => [] as ProductDetail[],
  );

  // Gallery paths are served from the storefront host; `image` is a fallback.
  const gallery = [
    ...new Set(
      [...(product.media_gallery_entries ?? []), product.image]
        .map(productImageUrl)
        .filter((url): url is string => Boolean(url)),
    ),
  ];
  const sizes = sizeOptions(product);
  const color = product.childrens?.length
    ? option(product.childrens[0], "color")?.label
    : option(product, "color")?.label;
  const inStock = sizes.length
    ? sizes.some((s) => s.available)
    : isAvailable(product);

  return (
    <article>
      <div className="grid gap-8 md:grid-cols-2">
        <div className="grid grid-cols-4 gap-2">
          {gallery.map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={src}
              src={src}
              alt={i === 0 ? product.name : ""}
              className={`w-full rounded-lg bg-neutral-100 object-contain ${
                i === 0 ? "col-span-4 aspect-square" : "aspect-square"
              }`}
            />
          ))}
        </div>

        <div className="flex flex-col gap-4">
          {product.brand && (
            <p className="text-sm uppercase tracking-wide text-neutral-500">
              {product.brand}
            </p>
          )}
          <h1 className="text-2xl font-bold">{product.name}</h1>
          <Price
            {...effectivePrice(product)}
            locale={locale}
            className="text-xl"
          />
          <p className="text-xs text-neutral-500">
            {dict.product.sku}: {product.sku}
          </p>

          {color && (
            <p className="text-sm">
              <span className="font-semibold">{dict.product.color}:</span>{" "}
              {color}
            </p>
          )}

          {sizes.length > 0 && (
            <section>
              <h2 className="mb-2 text-sm font-semibold">
                {dict.product.size}
              </h2>
              <ul className="flex flex-wrap gap-2">
                {sizes.map((size) => (
                  <li
                    key={size.sku}
                    className={`min-w-12 rounded border px-3 py-2 text-center text-sm ${
                      size.available
                        ? "border-neutral-300"
                        : "border-neutral-200 text-neutral-400 line-through"
                    }`}
                  >
                    {size.label}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <p
            className={`text-sm font-medium ${inStock ? "text-green-700" : "text-brand-accent"}`}
          >
            {inStock ? dict.product.inStock : dict.product.outOfStock}
          </p>

          {product.description && (
            <section>
              <h2 className="mb-2 text-sm font-semibold">
                {dict.product.description}
              </h2>
              <p className="whitespace-pre-line text-sm text-neutral-700">
                {product.description}
              </p>
            </section>
          )}
        </div>
      </div>

      {recommendations.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-4 text-xl font-bold">
            {dict.product.youMightAlsoLike}
          </h2>
          <ul className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
            {recommendations.slice(0, 8).map((item) => (
              <li key={item.sku}>
                <ProductCard product={cardFromDetail(item)} locale={locale} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
