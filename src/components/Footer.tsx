import Link from "next/link";
import { MAGENTO_BASE_URL } from "@/lib/base-url";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";

type Links = Dictionary["footer"];

/**
 * Content pages still live on the Magento site; this storefront links to them
 * until they are rebuilt here. Arabic pages use Magento's store switch parameter.
 */
function magentoPage(locale: Locale, path: string) {
  const base = MAGENTO_BASE_URL || "https://www.intersport.com.kw";
  const url = `${base}/${path.replace(/^\//, "")}`;
  return locale === "ar" ? `${url}?___store=${process.env.MAGENTO_STORE_CODE_AR ?? "intersport_ar"}` : url;
}

const SOCIAL = [
  { name: "Instagram", href: "https://www.instagram.com/intersportkuwait/" },
  { name: "Facebook", href: "https://www.facebook.com/intersportkuwait/" },
  { name: "TikTok", href: "https://www.tiktok.com/@intersport_kuwait" },
  { name: "Snapchat", href: "https://www.snapchat.com/add/intersportkw" },
  { name: "X", href: "https://twitter.com/IntersportKW" },
];

export function Footer({ locale, dict }: { locale: Locale; dict: Pick<Dictionary, "footer" | "site"> }) {
  const t = dict.footer;
  const page = (path: string) => magentoPage(locale, path);

  const columns: { title: string; links: { label: keyof Links; href: string; internal?: boolean }[] }[] = [
    {
      title: t.customerService,
      links: [
        { label: "contactUs", href: page("contact/") },
        { label: "faq", href: page("faq/") },
        { label: "trackOrders", href: `/${locale}/account/orders`, internal: true },
        { label: "deliveryInfo", href: page("delivery-information/") },
        { label: "internationalShipping", href: page("international-shipping/") },
        { label: "returns", href: page("return-policy/") },
        { label: "freePickup", href: page("click-collect/") },
      ],
    },
    {
      title: t.about,
      links: [
        { label: "aboutUs", href: page("about-us/") },
        { label: "points", href: page("points-program/") },
        { label: "giftCard", href: page("purchase-gift-card/") },
        { label: "blogs", href: page("blogs/") },
        { label: "account", href: `/${locale}/account`, internal: true },
        { label: "terms", href: page("terms-conditions/") },
        { label: "privacy", href: page("privacy-policy/") },
      ],
    },
  ];

  return (
    <footer className="mt-12 border-t border-neutral-200 bg-neutral-50 text-sm">
      <ul className="mx-auto grid max-w-7xl grid-cols-2 gap-4 px-4 py-6 text-center font-semibold text-brand md:grid-cols-4">
        {[t.freeDelivery, t.freeReturns, t.cod, t.secure].map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>

      <div className="border-t border-neutral-200">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
          {columns.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <h2 className="mb-3 font-bold uppercase tracking-wide">{column.title}</h2>
              <ul className="flex flex-col gap-2 text-neutral-700">
                {column.links.map((link) => (
                  <li key={link.label}>
                    {link.internal ? (
                      <Link href={link.href} className="hover:text-brand">
                        {t[link.label]}
                      </Link>
                    ) : (
                      <a href={link.href} className="hover:text-brand">
                        {t[link.label]}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          <section>
            <h2 className="mb-3 font-bold uppercase tracking-wide">{t.contact}</h2>
            <address className="flex flex-col gap-2 not-italic text-neutral-700">
              <span>{t.address}</span>
              <a href="tel:1813131" dir="ltr" className="text-start hover:text-brand">
                1813131
              </a>
              <a href="mailto:customerservice@aaw.com" className="hover:text-brand">
                customerservice@aaw.com
              </a>
            </address>
          </section>

          <section>
            <h2 className="mb-3 font-bold uppercase tracking-wide">{t.followUs}</h2>
            <ul className="flex flex-wrap gap-2">
              {SOCIAL.map((s) => (
                <li key={s.name}>
                  <a
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block rounded-full border border-neutral-300 px-3 py-1 hover:border-brand hover:text-brand"
                  >
                    {s.name}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>

      <p className="border-t border-neutral-200 py-4 text-center text-neutral-500">
        © {new Date().getFullYear()} {dict.site.name}. {t.rights}
      </p>
    </footer>
  );
}
