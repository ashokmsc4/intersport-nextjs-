import type { Metadata } from "next";
import { cache, Suspense } from "react";
import { notFound, permanentRedirect } from "next/navigation";
import { hasLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { MagentoError, productImageUrl } from "@/lib/magento/client";
import {
  effectivePrice,
  getProductDetail,
  getRecommendations,
  skuForUrlKey,
  urlKeysForSkus,
} from "@/lib/magento/catalog";
import { productHref } from "@/lib/urls";
import type { ProductDetail } from "@/lib/magento/types";
import { getSizeGuideHtml, getSizeRegions } from "@/lib/magento/sizes";
import { isOptimizable } from "@/lib/media";
import { AddToCart, type SizeChoice } from "@/components/AddToCart";
import { Price } from "@/components/Price";
import { ProductCard, cardFromDetail } from "@/components/ProductCard";
import { ProductImage } from "@/components/ProductImage";
import { Rail } from "@/components/home/Rail";
import { BackendError } from "@/components/BackendError";
import { describeError } from "@/lib/magento/diagnose";

// Product pages are rendered on first visit, then served from the cache and
// refreshed in the background (MAGENTO_REVALIDATE_SECONDS). Store stock is live
// data, so AddToCart loads it in the browser when Click & Collect is chosen.
export function generateStaticParams() {
  return [];
}

const detail = (locale: Locale, sku: string) =>
  getProductDetail(locale, sku).catch((error) => {
    if (error instanceof MagentoError && error.status === 404) return null;
    throw error;
  });

/**
 * The product for a URL key (/en/<key>.html is rewritten here by proxy.ts). An old
 * /en/product/<SKU> link moves permanently to the product's SEO URL.
 */
const loadProduct = cache(async (lang: string, key: string) => {
  if (!hasLocale(lang) || !key) notFound();
  const locale = lang as Locale;
  const sku = await skuForUrlKey(locale, key);
  if (!sku) {
    const product = await detail(locale, key);
    if (!product) notFound();
    const urlKey = (await urlKeysForSkus(locale, [product.sku])).get(product.sku);
    if (urlKey && urlKey !== key) permanentRedirect(productHref(locale, { urlKey, sku: product.sku }));
    return { locale, product, urlKey: urlKey ?? null };
  }
  const product = await detail(locale, sku);
  if (!product) notFound();
  return { locale, product, urlKey: key };
});

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/product/[key]">): Promise<Metadata> {
  const { lang, key } = await params;
  // A Magento failure is reported by the page itself (error boundary), not here.
  const loaded = await loadProduct(lang, decodeURIComponent(key)).catch((error) => {
    if (error instanceof MagentoError) return null;
    throw error;
  });
  if (!loaded) return {};
  const { product, urlKey } = loaded;
  const href = (l: Locale) => productHref(l, { urlKey, sku: product.sku });
  const image = productImageUrl(
    product.media_gallery_entries?.[0] ?? product.image,
  );
  return {
    title:
      product.brand && !product.name.startsWith(product.brand)
        ? `${product.brand} ${product.name}`
        : product.name,
    openGraph: image ? { images: [image] } : undefined,
    // The URL key is the same in both store views.
    alternates: {
      canonical: href(lang === "ar" ? "ar" : "en"),
      languages: { en: href("en"), ar: href("ar") },
    },
  };
}

const isAvailable = (p: ProductDetail) =>
  p.item_is_salable && (p.stock === undefined || p.stock > 0);

function option(product: ProductDetail, code: string) {
  return product.custom_attributes.find((a) => a.attribute_code === code);
}

const sizePosition = (child: ProductDetail) =>
  Number(option(child, "size")?.position ?? 0);

/** One choice per child product, in shop order, with the options add-to-cart needs. */
function sizeOptions(product: ProductDetail): SizeChoice[] {
  return [...(product.childrens ?? [])]
    .sort((a, b) => sizePosition(a) - sizePosition(b))
    .map((child) => ({
      productId: String(child.id),
      sku: child.sku,
      label: option(child, "size")?.label || child.sku,
      available: isAvailable(child),
      options: child.custom_attributes
        .filter((a) => a.attribute_id && a.value)
        .map((a) => ({
          option_id: String(a.attribute_id),
          option_value: Number(a.value),
        })),
    }));
}

export default async function ProductPage({
  params,
}: PageProps<"/[lang]/product/[key]">) {
  const { lang, key } = await params;
  // Magento unreachable: show a notice. (A thrown error on a page's first cached render
  // becomes a bare 500 without the site layout.)
  const loaded = await loadProduct(lang, decodeURIComponent(key)).catch((error) => {
    if (error instanceof MagentoError) return describeError(error);
    throw error;
  });
  if (typeof loaded === "string") {
    return <BackendError dict={await getDictionary(hasLocale(lang) ? lang : "en")} reason={loaded} />;
  }
  const { locale, product } = loaded;
  const dict = await getDictionary(locale);

  const sized = (product.childrens ?? []).length > 0;
  const [sizeRegions, sizeGuide] = await Promise.all([
    // Website widgets: optional, so a failure just hides them.
    sized ? getSizeRegions(String(product.id)).catch(() => null) : null,
    sized ? getSizeGuideHtml(String(product.id)).catch(() => null) : null,
  ]);

  // Gallery paths are served from the storefront host; `image` is a fallback.
  const gallery = [
    ...new Set(
      [...(product.media_gallery_entries ?? []), product.image]
        .map(productImageUrl)
        .filter((url): url is string => Boolean(url)),
    ),
  ];
  const sizes = sizeOptions(product);
  // Magento labels mix case ("rose Dustilluminate Yellow"); show them in title case.
  const color = (
    product.childrens?.length
      ? option(product.childrens[0], "color")?.label
      : option(product, "color")?.label
  )
    ?.toLowerCase()
    .replace(/(^|[\s/-])(\p{L})/gu, (_, sep: string, ch: string) => sep + ch.toUpperCase());
  const inStock = sizes.length
    ? sizes.some((s) => s.available)
    : isAvailable(product);

  return (
    <article>
      <div className="grid gap-8 md:grid-cols-2">
        <div className="grid grid-cols-4 gap-2">
          {gallery.map((src, i) => (
            <ProductImage
              key={src}
              src={src}
              alt={i === 0 ? product.name : ""}
              priority={i === 0}
              sizes={i === 0 ? "(min-width: 768px) 50vw, 100vw" : "(min-width: 768px) 12vw, 25vw"}
              className={`rounded-lg ${i === 0 ? "col-span-4 aspect-square" : "aspect-square"}`}
            />
          ))}
        </div>

        <div className="flex flex-col gap-6">
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
            <section className="flex flex-col gap-4">
              <p className="text-sm">
                <span className="me-4 font-bold uppercase tracking-wider">{dict.product.color}</span>
                <span>{color}</span>
              </p>
              {gallery[0] && (
                <span className="block size-16 rounded border border-neutral-400 p-1" title={color}>
                  <ProductImage src={gallery[0]} alt={color} sizes="64px" className="size-full" />
                </span>
              )}
            </section>
          )}

          {!inStock && (
            <p className="text-sm font-medium text-brand-accent">{dict.product.outOfStock}</p>
          )}

          <AddToCart
            locale={locale}
            sku={product.sku}
            productId={String(product.id)}
            name={product.name}
            image={gallery[0] ?? null}
            imageOptimized={gallery[0] ? isOptimizable(gallery[0]) : false}
            color={color}
            sizes={sizes}
            sizeRegions={sizeRegions}
            hasSizeGuide={Boolean(sizeGuide)}
            inStock={inStock}
            dict={{ product: dict.product, errors: dict.errors, delivery: dict.delivery }}
          />

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

      {/* Recommendations can take seconds on a cold cache; the page shows without them. */}
      <Suspense fallback={null}>
        <Recommendations
          locale={locale}
          sku={product.sku}
          title={dict.product.youMightAlsoLike}
          labels={{ previous: dict.home.previous, next: dict.home.next }}
        />
      </Suspense>
    </article>
  );
}

async function Recommendations({
  locale,
  sku,
  title,
  labels,
}: {
  locale: Locale;
  sku: string;
  title: string;
  labels: { previous: string; next: string };
}) {
  const all = (await getRecommendations(locale, sku).catch(() => [] as ProductDetail[])).slice(0, 16);
  // Recommendations come without URL keys; look them up so the links are SEO URLs. The
  // lookup only finds catalog-listed products, which also drops out-of-stock ones that the
  // recommendation endpoint still returns. If the lookup fails, show them all as before.
  const urlKeys = await urlKeysForSkus(locale, all.map((i) => i.sku)).catch(() => null);
  const items = (urlKeys ? all.filter((i) => urlKeys.has(i.sku)) : all).slice(0, 12);
  if (items.length === 0) return null;
  return (
    <section className="mt-12">
      <h2 className="mb-4 text-xl font-bold">{title}</h2>
      <Rail labels={labels}>
        {items.map((item) => (
          <li key={item.sku} className="w-44 shrink-0 snap-start sm:w-56">
            <ProductCard product={cardFromDetail(item, urlKeys?.get(item.sku))} locale={locale} />
          </li>
        ))}
      </Rail>
    </section>
  );
}
