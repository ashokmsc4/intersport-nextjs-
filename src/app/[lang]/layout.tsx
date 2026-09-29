import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { dir, hasLocale, locales } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CartDrawerProvider } from "@/components/cart/CartDrawer";
import { imageHosts } from "@/lib/media";
import "../globals.css";

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({
  params,
}: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return {
    title: { default: dict.site.name, template: `%s | ${dict.site.name}` },
    description: dict.site.description,
    alternates: { languages: { en: "/en", ar: "/ar" } },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);

  return (
    <html lang={lang} dir={dir(lang)} className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <CartDrawerProvider
          locale={lang}
          dict={{ miniCart: dict.miniCart, cart: dict.cart, delivery: dict.delivery }}
          imageHosts={imageHosts()}
        >
          <Header locale={lang} dict={dict} />
          <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8">
            {children}
          </main>
          <Footer locale={lang} dict={dict} />
        </CartDrawerProvider>
      </body>
    </html>
  );
}
