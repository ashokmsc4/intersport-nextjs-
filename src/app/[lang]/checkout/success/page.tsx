import Link from "next/link";
import { notFound } from "next/navigation";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { buttonClass } from "@/components/forms/Field";

export default async function CheckoutSuccessPage({
  params,
  searchParams,
}: PageProps<"/[lang]/checkout/success">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const order = String((await searchParams).order ?? "");

  return (
    <div className="py-16 text-center">
      <h1 className="mb-4 text-2xl font-bold">{dict.checkout.successTitle}</h1>
      {order && (
        <p className="mb-8 text-neutral-700">
          {dict.checkout.successBody.replace("{order}", order)}
        </p>
      )}
      <Link href={`/${lang}`} className={buttonClass}>
        {dict.cart.continueShopping}
      </Link>
    </div>
  );
}
