import Link from "next/link";
import { notFound } from "next/navigation";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getMenuCategories } from "@/lib/magento/catalog";

// Regenerate so a build without backend access does not freeze the error state.
export const revalidate = 300;

export default async function HomePage({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);

  const categories = await getMenuCategories(lang).catch((error) => {
    console.error("[magento] menu categories:", error);
    return null;
  });

  return (
    <section>
      <h1 className="mb-6 text-2xl font-bold">{dict.home.shopByCategory}</h1>

      {categories === null ? (
        <p className="rounded border border-amber-300 bg-amber-50 p-4 text-amber-900">
          {dict.home.backendUnavailable}
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {categories.map((category) => (
            <li key={category.id}>
              <Link
                href={`/${lang}/category/${category.id}`}
                className="flex h-full flex-col items-center gap-3 rounded-lg border border-neutral-200 p-4 text-center font-medium hover:border-brand hover:text-brand"
              >
                {category.custom_image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={category.custom_image}
                    alt=""
                    loading="lazy"
                    className="aspect-square w-full rounded object-cover"
                  />
                )}
                {category.name}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
