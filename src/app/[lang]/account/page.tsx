import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { customerMobile } from "@/lib/magento/customer";
import { requireCustomer } from "@/lib/shopper";
import { logoutAction } from "@/app/actions/auth";
import { AccountNav } from "@/components/account/AccountNav";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/account">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  return { title: (await getDictionary(lang)).account.myAccount };
}

export default async function AccountPage({
  params,
}: PageProps<"/[lang]/account">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const { customer } = await requireCustomer(lang, `/${lang}/account`);
  const dict = await getDictionary(lang);
  const t = dict.account;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-4 text-2xl font-bold">
        {t.welcome.replace("{name}", customer.firstname)}
      </h1>
      <AccountNav locale={lang} dict={dict} current="overview" />
      <section className="rounded-lg border border-neutral-200 p-4">
        <h2 className="mb-3 font-semibold">{t.details}</h2>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="text-neutral-500">{t.firstname}</dt>
          <dd>
            {customer.firstname} {customer.lastname}
          </dd>
          <dt className="text-neutral-500">{t.email}</dt>
          <dd>{customer.email}</dd>
          {customerMobile(customer) && (
            <>
              <dt className="text-neutral-500">{t.mobile}</dt>
              <dd dir="ltr" className="text-start">
                {customerMobile(customer)}
              </dd>
            </>
          )}
        </dl>
      </section>
      <form action={logoutAction} className="mt-6">
        <input type="hidden" name="locale" value={lang} />
        <button
          type="submit"
          className="rounded border border-neutral-300 px-4 py-2 text-sm font-medium"
        >
          {dict.nav.logout}
        </button>
      </form>
    </div>
  );
}
