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
  getSizeLabels,
} from "@/lib/magento/catalog";
import type { ProductDetail } from "@/lib/magento/types";
import { Price } from "@/components/Price";
import { ProductCard, cardFromDetail } from "@/components/ProductCard";

const loadProduct = cache(async (lang: string, id: string) => {
  const productId = Number(id);
  if (!hasLocale(lang) || !Number.isInteger(productId)) notFound();
  const product = await getProductDetail(lang, productId).catch((error) => {
    if (error instanceof MagentoError && error.status === 404) return null;
    throw error;
  });
  if (!product) notFound();
  return { locale: lang as Locale, product };
});

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/product/[id]">): Promise<Metadata> {
  const { lang, id } = await params;
  const { product } = await loadProduct(lang, id);
  const image = productImageUrl(product.image);
  return {
    title:
      product.brand && !product.name.startsWith(product.brand)
        ? `${product.brand} ${product.name}`
        : product.name,
    openGraph: image ? { images: [image] } : undefined,
  };
}

type SizeOption = { sku: string; label: string; available: boolean };

function sizeOptions(
  product: ProductDetail,
  labels: Map<string, string>,
): SizeOption[] {
  return (product.childrens ?? []).map((child) => {
    const size = child.custom_attributes.find(
      (a) => a.attribute_code === "size",
    );
    return {
      sku: child.sku,
      label: size?.label || labels.get(String(size?.value)) || child.sku,
      available: child.item_is_salable && child.stock > 0,
    };
  });
}

export default async function ProductPage({
  params,
}: PageProps<"/[lang]/product/[id]">) {
  const { lang, id } = await params;
  const { locale, product } = await loadProduct(lang, id);
  const dict = await getDictionary(locale);

  const [labels, recommendations] = await Promise.all([
    getSizeLabels(locale).catch(() => new Map<string, string>()),
    getRecommendations(locale, product.sku).catch(() => [] as ProductDetail[]),
  ]);

  const gallery = [
    ...new Set(
      [product.image, ...(product.media_gallery_entries ?? [])]
        .map(productImageUrl)
        .filter((url): url is string => Boolean(url)),
    ),
  ];
  const sizes = sizeOptions(product, labels);
  const inStock = product.item_is_salable && product.stock > 0;

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
              <li key={item.id}>
                <ProductCard product={cardFromDetail(item)} locale={locale} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
