import Link from "next/link";
import { notFound } from "next/navigation";
import { hasLocale, type Locale } from "@/i18n/config";
import { getDictionary, type Dictionary } from "@/i18n/dictionaries";
import { getCategoryProducts, getMenuCategories } from "@/lib/magento/catalog";
import {
  getHomeSections,
  type HomeLink,
  type HomeSection,
} from "@/lib/magento/home";
import { Banner } from "@/components/Banner";
import { ProductCard, cardFromListItem } from "@/components/ProductCard";
import { ProductImage } from "@/components/ProductImage";
import { productImageUrl } from "@/lib/magento/client";

// Regenerate so a build without backend access does not freeze the error state.
export const revalidate = 300;

/** App links are category ids or absolute URLs (the app adds ?mobile=true). */
function linkHref(locale: Locale, link: HomeLink) {
  if (link.category) return `/${locale}/category/${link.category}`;
  if (link.url) {
    const url = new URL(link.url);
    url.searchParams.delete("mobile");
    return url.toString();
  }
  return null;
}

function Linked({
  href,
  className,
  children,
}: {
  href: string | null;
  className?: string;
  children: React.ReactNode;
}) {
  if (!href) return <div className={className}>{children}</div>;
  return href.startsWith("/") ? (
    <Link href={href} className={className}>
      {children}
    </Link>
  ) : (
    <a href={href} className={className}>
      {children}
    </a>
  );
}

async function ProductRail({
  locale,
  dict,
  name,
  category,
}: {
  locale: Locale;
  dict: Dictionary;
  name: string;
  category: number;
}) {
  const result = await getCategoryProducts(locale, {
    categoryId: category,
    pageSize: 8,
  }).catch(() => null);
  if (!result?.items.length) return null;

  return (
    <section>
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-xl font-bold">{name}</h2>
        <Link
          href={`/${locale}/category/${category}`}
          className="text-sm font-medium text-brand"
        >
          {dict.home.viewAll}
        </Link>
      </div>
      <ul className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2">
        {result.items.slice(0, 8).map((product) => (
          <li key={product.sku} className="w-40 shrink-0 snap-start sm:w-52">
            <ProductCard product={cardFromListItem(product)} locale={locale} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function Section({
  section,
  locale,
  dict,
}: {
  section: HomeSection;
  locale: Locale;
  dict: Dictionary;
}) {
  switch (section.layout) {
    case "bannerImage":
      return (
        // The app shows groups as a carousel; side by side reads better on wide screens.
        <section
          className={`grid gap-3 ${section.items.length > 1 ? "md:grid-cols-2" : ""}`}
        >
          {section.items.map((item) => (
            <Linked
              key={item.image}
              href={linkHref(locale, item)}
              className="block overflow-hidden rounded-lg bg-neutral-100"
            >
              <Banner image={item.image} desktopImage={item.desktop_image} />
            </Linked>
          ))}
        </section>
      );
    case "category":
      return (
        <section>
          {section.title && (
            <h2 className="mb-4 text-xl font-bold">{section.title}</h2>
          )}
          <ul className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2">
            {section.items.map((item) => (
              <li key={item.image} className="w-32 shrink-0 snap-start sm:w-44">
                <Linked
                  href={linkHref(locale, item)}
                  className="block overflow-hidden rounded-lg bg-neutral-100"
                >
                  <Banner image={item.desktop_image ?? item.image} />
                </Linked>
              </li>
            ))}
          </ul>
        </section>
      );
    case "threeColumn":
      return (
        <ProductRail
          locale={locale}
          dict={dict}
          name={section.name}
          category={section.category}
        />
      );
    case "bannerTimer": {
      // Ended timers are already dropped by getHomeSections.
      const end = Date.parse(section.endTime.replace(" ", "T"));
      return (
        <Link
          href={`/${locale}/category/${section.category}`}
          className="block rounded-lg bg-brand p-4 text-center font-semibold text-white"
        >
          {section.name} ·{" "}
          {dict.home.endsOn.replace(
            "{date}",
            new Date(end).toLocaleDateString(locale === "ar" ? "ar-KW" : "en-KW"),
          )}
        </Link>
      );
    }
    default:
      return null;
  }
}

export default async function HomePage({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);

  const [sections, categories] = await Promise.all([
    getHomeSections(lang).catch((error) => {
      console.error("[magento] home config:", error);
      return null;
    }),
    getMenuCategories(lang).catch(() => []),
  ]);

  return (
    <div className="flex flex-col gap-10">
      {sections === null && (
        <p className="rounded border border-amber-300 bg-amber-50 p-4 text-amber-900">
          {dict.home.backendUnavailable}
        </p>
      )}

      {sections?.map((section, i) => (
        <Section key={i} section={section} locale={lang} dict={dict} />
      ))}

      {categories.length > 0 && (
        <section>
          <h2 className="mb-4 text-xl font-bold">{dict.home.shopByCategory}</h2>
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {categories.map((category) => (
              <li key={category.id}>
                <Link
                  href={`/${lang}/category/${category.id}`}
                  className="flex h-full flex-col items-center gap-3 rounded-lg border border-neutral-200 p-4 text-center font-medium hover:border-brand hover:text-brand"
                >
                  {category.custom_image && (
                    <ProductImage
                      src={productImageUrl(category.custom_image)}
                      alt=""
                      sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                      className="aspect-square w-full rounded"
                    />
                  )}
                  {category.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
