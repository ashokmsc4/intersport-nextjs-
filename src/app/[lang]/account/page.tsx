import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireCustomer } from "@/lib/shopper";
import { AccountShell, accountLinks } from "@/components/account/AccountShell";
import { ChevronIcon } from "@/components/icons";

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
    <AccountShell locale={lang} dict={dict} customer={customer} current="dashboard" title={t.dashboard}>
      <ul className="grid gap-4 lg:grid-cols-2">
        {accountLinks(lang, t).map(({ key, href, label, hint, Icon, tone }) => (
          <li key={key}>
            <Link
              href={href}
              className="group flex items-center gap-4 rounded-lg bg-white p-5 transition-shadow hover:shadow-md"
            >
              <span className={`flex size-10 shrink-0 items-center justify-center rounded-md [&_svg]:size-5 ${tone}`}>
                <Icon />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">{label}</span>
                <span className="block text-xs text-neutral-500">{hint}</span>
              </span>
              <span className="text-neutral-500 transition-transform group-hover:translate-x-0.5 group-hover:text-neutral-900 rtl:rotate-180 rtl:group-hover:-translate-x-0.5">
                <ChevronIcon />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </AccountShell>
  );
}
