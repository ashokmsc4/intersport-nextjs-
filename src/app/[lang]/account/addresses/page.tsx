import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getAreas } from "@/lib/magento/checkout";
import { customerMobile, getAddresses } from "@/lib/magento/customer";
import { addressLine } from "@/lib/addresses";
import { requireCustomer } from "@/lib/shopper";
import { AccountNav } from "@/components/account/AccountNav";
import { AddressForm } from "@/components/account/AddressForm";
import { DeleteAddressButton } from "@/components/account/DeleteAddressButton";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/account/addresses">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  return { title: (await getDictionary(lang)).addresses.title };
}

export default async function AddressesPage({
  params,
}: PageProps<"/[lang]/account/addresses">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const { token, customer } = await requireCustomer(lang, `/${lang}/account/addresses`);
  const [dict, addresses, governorates] = await Promise.all([
    getDictionary(lang),
    getAddresses(lang, token, customer.id),
    getAreas(lang),
  ]);
  const t = dict.addresses;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-4 text-2xl font-bold">{t.title}</h1>
      <AccountNav locale={lang} dict={dict} current="addresses" />

      {addresses.length === 0 ? (
        <p className="mb-8 text-neutral-600">{t.none}</p>
      ) : (
        <ul className="mb-8 grid gap-3 sm:grid-cols-2">
          {addresses.map((a) => (
            <li key={a.address_id} className="flex flex-col gap-1 rounded-lg border border-neutral-200 p-4 text-sm">
              <p className="font-semibold">
                {a.firstname} {a.lastname}
                {a.is_default_shipping === 1 && (
                  <span className="ms-2 rounded bg-neutral-100 px-2 py-0.5 text-xs font-normal">
                    {t.default}
                  </span>
                )}
              </p>
              <p>{addressLine(a, dict.checkout)}</p>
              <p dir="ltr" className="text-start">{a.telephone}</p>
              <DeleteAddressButton
                locale={lang}
                addressId={a.address_id}
                label={t.delete}
                errorLabel={dict.errors.generic}
              />
            </li>
          ))}
        </ul>
      )}

      <h2 className="mb-4 text-lg font-semibold">{t.add}</h2>
      <AddressForm
        locale={lang}
        governorates={governorates}
        defaults={{
          firstname: customer.firstname,
          lastname: customer.lastname,
          telephone: customerMobile(customer),
        }}
        dict={{ account: dict.account, checkout: dict.checkout, addresses: dict.addresses, errors: dict.errors }}
      />
    </div>
  );
}
