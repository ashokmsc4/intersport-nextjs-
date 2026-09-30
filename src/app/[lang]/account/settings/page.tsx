import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { customerMobile } from "@/lib/magento/customer";
import { requireCustomer } from "@/lib/shopper";
import { AccountShell } from "@/components/account/AccountShell";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/account/settings">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  return { title: (await getDictionary(lang)).account.settings };
}

export default async function SettingsPage({
  params,
}: PageProps<"/[lang]/account/settings">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const { customer } = await requireCustomer(lang, `/${lang}/account/settings`);
  const dict = await getDictionary(lang);
  const t = dict.account;
  const mobile = customerMobile(customer);

  return (
    <AccountShell locale={lang} dict={dict} customer={customer} current="settings" title={t.settings}>
      <section className="rounded-lg bg-white p-5">
        <h2 className="mb-3 font-semibold">{t.details}</h2>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="text-neutral-500">{t.firstname}</dt>
          <dd>{customer.firstname}</dd>
          <dt className="text-neutral-500">{t.lastname}</dt>
          <dd>{customer.lastname}</dd>
          <dt className="text-neutral-500">{t.email}</dt>
          <dd>{customer.email}</dd>
          {mobile && (
            <>
              <dt className="text-neutral-500">{t.mobile}</dt>
              <dd dir="ltr" className="text-start">
                {mobile}
              </dd>
            </>
          )}
        </dl>
      </section>
    </AccountShell>
  );
}
