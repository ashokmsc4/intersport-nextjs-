import Link from "next/link";
import { notFound } from "next/navigation";
import { hasLocale, type Locale } from "@/i18n/config";
import { getDictionary, type Dictionary } from "@/i18n/dictionaries";
import { getCategoryIndex, getCategoryProducts, getMenuCategories } from "@/lib/magento/catalog";
import { categoryHref } from "@/lib/urls";
import {
  getHomeSections,
  type HomeLink,
  type HomeSection,
} from "@/lib/magento/home";
import { BackendError } from "@/components/BackendError";
import { Banner } from "@/components/Banner";
import { settle } from "@/lib/magento/diagnose";
import { ProductCard, cardFromListItem } from "@/components/ProductCard";
import { ProductImage } from "@/components/ProductImage";
import { ArrowIcon } from "@/components/icons";
import { Carousel } from "@/components/home/Carousel";
import { Countdown } from "@/components/home/Countdown";
import { Rail } from "@/components/home/Rail";
import { productImageUrl } from "@/lib/magento/client";

// Regenerate so a build without backend access does not freeze the error state.
export const revalidate = 300;

/** Category id → its SEO URL (see getCategoryIndex). */
type CatHref = (id: number) => string;

/** App links are category ids or absolute URLs (the app adds ?mobile=true). */
function linkHref(link: HomeLink, cat: CatHref) {
  if (link.category) return cat(link.category);
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

/** Section title with the brand's red accent bar and an optional View all link. */
function SectionHeader({ title, href, action }: { title: string; href?: string; action?: string }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3 sm:mb-5 sm:items-end sm:gap-4">
      <h2 className="flex min-w-0 items-center gap-2.5 text-lg leading-tight font-bold uppercase tracking-wide sm:gap-3 sm:text-2xl">
        <span aria-hidden className="h-6 w-1.5 shrink-0 rounded-full bg-brand-accent" />
        {title}
      </h2>
      {href && action && (
        <Link
          href={href}
          className="group flex shrink-0 items-center gap-1 text-sm font-semibold text-brand hover:underline [&_svg]:size-4 [&_svg]:transition-transform [&_svg]:rtl:rotate-180"
        >
          {action}
          <ArrowIcon />
        </Link>
      )}
    </div>
  );
}

async function ProductRail({
  locale,
  dict,
  name,
  category,
  cat,
}: {
  locale: Locale;
  dict: Dictionary;
  name: string;
  category: number;
  cat: CatHref;
}) {
  const result = await getCategoryProducts(locale, {
    categoryId: category,
    pageSize: 10,
  }).catch(() => null);
  if (!result?.items.length) return null;

  return (
    <section>
      <SectionHeader title={name} href={cat(category)} action={dict.home.viewAll} />
      <Rail labels={{ previous: dict.home.previous, next: dict.home.next }}>
        {result.items.slice(0, 10).map((product) => (
          <li key={product.sku} className="w-44 shrink-0 snap-start sm:w-56">
            <ProductCard product={cardFromListItem(product)} locale={locale} />
          </li>
        ))}
      </Rail>
    </section>
  );
}

function Section({
  section,
  locale,
  dict,
  hero,
  cat,
}: {
  section: HomeSection;
  locale: Locale;
  dict: Dictionary;
  cat: CatHref;
  /** The first banner group: a full-width carousel with its first image preloaded. */
  hero: boolean;
}) {
  switch (section.layout) {
    case "bannerImage":
      if (hero) {
        return (
          <Carousel
            labels={{
              label: dict.home.featured,
              previous: dict.home.previous,
              next: dict.home.next,
              slide: dict.home.slide,
            }}
          >
            {section.items.map((item, i) => (
              <Linked key={item.image} href={linkHref(item, cat)} className="block bg-neutral-100">
                <Banner
                  image={item.image}
                  desktopImage={item.desktop_image}
                  // Full width on every screen; all slides load up front so the track keeps one height.
                  preload={i === 0}
                  eager
                />
              </Linked>
            ))}
          </Carousel>
        );
      }
      return (
        <section className={`grid gap-4 ${section.items.length > 1 ? "md:grid-cols-2" : ""}`}>
          {section.items.map((item) => (
            <Linked
              key={item.image}
              href={linkHref(item, cat)}
              className="group block overflow-hidden rounded-2xl bg-neutral-100 shadow-sm transition hover:shadow-lg [&_img]:transition-transform [&_img]:duration-500 hover:[&_img]:scale-[1.03]"
            >
              <Banner image={item.image} desktopImage={item.desktop_image} />
            </Linked>
          ))}
        </section>
      );
    case "category":
      return (
        <section>
          {section.title && <SectionHeader title={section.title} />}
          <Rail labels={{ previous: dict.home.previous, next: dict.home.next }} className="gap-3 sm:gap-4">
            {section.items.map((item) => (
              <li key={item.image} className="w-36 shrink-0 snap-start sm:w-48">
                <Linked
                  href={linkHref(item, cat)}
                  className="block overflow-hidden rounded-xl bg-neutral-100 ring-brand/0 transition hover:-translate-y-1 hover:shadow-lg hover:ring-2 hover:ring-brand"
                >
                  <Banner image={item.desktop_image ?? item.image} />
                </Linked>
              </li>
            ))}
          </Rail>
        </section>
      );
    case "threeColumn":
      return (
        <ProductRail
          locale={locale}
          dict={dict}
          name={section.name}
          category={section.category}
          cat={cat}
        />
      );
    case "bannerTimer": {
      // Ended timers are already dropped by getHomeSections.
      const end = Date.parse(section.endTime.replace(" ", "T"));
      return (
        <Link
          href={cat(section.category)}
          className="group relative flex flex-col items-center justify-between gap-5 overflow-hidden rounded-2xl bg-gradient-to-br from-brand to-[#0a2a5c] px-6 py-8 text-white shadow-lg sm:flex-row sm:px-10"
        >
          <span aria-hidden className="absolute -end-16 -top-16 size-56 rounded-full bg-brand-accent/30 blur-2xl" />
          <div className="relative text-center sm:text-start">
            {section.title && (
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">{section.title}</p>
            )}
            <p className="mt-1 text-2xl font-extrabold uppercase sm:text-3xl">{section.name}</p>
            <p className="mt-1 text-sm text-white/80">{dict.home.endsIn}</p>
          </div>
          <div className="relative flex flex-col items-center gap-4 sm:flex-row">
            <Countdown
              end={end}
              labels={{
                days: dict.home.days,
                hours: dict.home.hours,
                minutes: dict.home.minutes,
                seconds: dict.home.seconds,
              }}
            />
            <span className="flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-brand transition group-hover:bg-brand-accent group-hover:text-white [&_svg]:size-4 [&_svg]:rtl:rotate-180">
              {dict.home.shopNow}
              <ArrowIcon />
            </span>
          </div>
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

  const [home, categories, index] = await Promise.all([
    settle(getHomeSections(lang), "home config"),
    getMenuCategories(lang).catch(() => []),
    getCategoryIndex(lang).catch(() => null),
  ]);
  const cat: CatHref = (id) => categoryHref(lang, { id, path: index?.pathById.get(id) });
  const sections = home.value;

  const heroIndex = sections?.findIndex((s) => s.layout === "bannerImage") ?? -1;

  return (
    <div className="flex flex-col gap-12 sm:gap-16">
      {home.error !== null && <BackendError dict={dict} reason={home.error} />}

      {sections?.map((section, i) => (
        <Section key={i} section={section} locale={lang} dict={dict} hero={i === heroIndex} cat={cat} />
      ))}

      {categories.length > 0 && (
        <section>
          <SectionHeader title={dict.home.shopByCategory} />
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {categories.map((category) => (
              <li key={category.id}>
                <Link
                  href={cat(category.id)}
                  className="group relative block overflow-hidden rounded-2xl bg-gradient-to-br from-neutral-100 to-neutral-200 shadow-sm transition hover:shadow-lg"
                >
                  {category.custom_image ? (
                    <ProductImage
                      src={productImageUrl(category.custom_image)}
                      alt=""
                      sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                      className="aspect-[4/5] w-full [&_img]:transition-transform [&_img]:duration-500 group-hover:[&_img]:scale-105"
                    />
                  ) : (
                    <div className="aspect-[4/5] w-full" />
                  )}
                  <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                  <span className="absolute inset-x-0 bottom-0 flex flex-col gap-1 p-4 text-white">
                    <span className="text-lg font-bold uppercase leading-tight tracking-wide">{category.name}</span>
                    <span className="flex items-center gap-1 text-xs font-semibold opacity-90 transition group-hover:gap-2 [&_svg]:size-3.5 [&_svg]:rtl:rotate-180">
                      {dict.home.shopNow}
                      <ArrowIcon />
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
