import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { productImageUrl } from "@/lib/magento/client";
import { getCart } from "@/lib/magento/cart";
import { getAreas, type AddressInput } from "@/lib/magento/checkout";
import {
  customerMobile,
  getAddresses,
  getCustomer,
  type SavedAddress,
} from "@/lib/magento/customer";
import { addressLine } from "@/lib/addresses";
import { formatPrice } from "@/lib/format";
import { currentCartRef } from "@/lib/shopper";
import { CheckoutForm, type SavedChoice } from "@/components/checkout/CheckoutForm";
import { ProductImage } from "@/components/ProductImage";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/checkout">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  return { title: (await getDictionary(lang)).checkout.title };
}

export default async function CheckoutPage({
  params,
}: PageProps<"/[lang]/checkout">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();

  const ref = await currentCartRef();
  const cart = ref ? await getCart(lang, ref).catch(() => null) : null;
  if (!ref || !cart || cart.items.length === 0) redirect(`/${lang}/cart`);

  const [dict, governorates, customer] = await Promise.all([
    getDictionary(lang),
    getAreas(lang),
    ref.kind === "customer"
      ? getCustomer(lang, ref.token).catch(() => null)
      : Promise.resolve(null),
  ]);
  const addresses: SavedAddress[] =
    ref.kind === "customer" && customer
      ? await getAddresses(lang, ref.token, customer.id).catch(() => [])
      : [];
  // Default address first, mapped onto the checkout fields.
  const saved: SavedChoice[] = [...addresses]
    .sort((a, b) => b.is_default_shipping - a.is_default_shipping)
    .map((a) => ({
      id: a.address_id,
      label: addressLine(a, dict.checkout),
      address: {
        firstname: a.firstname,
        lastname: a.lastname,
        telephone: a.telephone,
        governorate: a.region,
        areaId: a.city_id,
        areaName: a.city,
        block: a.block,
        street: a.street,
        avenue: a.address_line_1,
        house: a.building_number ?? "",
        floor: a.floor_number ?? "",
        apartment: a.apartment_number ?? "",
      },
    }));
  const prefill: Partial<AddressInput> = customer
    ? {
        firstname: customer.firstname,
        lastname: customer.lastname,
        email: customer.email,
        telephone: customerMobile(customer),
      }
    : {};
  const t = dict.checkout;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">{t.title}</h1>
      <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
        <div>
          {ref.kind === "guest" && (
            <p className="mb-6 rounded bg-neutral-100 p-3 text-sm">
              {t.guestNote}{" "}
              <Link
                href={`/${lang}/account/login?next=/${lang}/checkout`}
                className="font-semibold text-brand underline"
              >
                {t.signInFaster}
              </Link>
            </p>
          )}
          <CheckoutForm
            locale={lang}
            governorates={governorates}
            prefill={prefill}
            saved={saved}
            dict={{
              addresses: dict.addresses,
              checkout: dict.checkout,
              account: dict.account,
              cart: dict.cart,
              errors: dict.errors,
            }}
          />
        </div>
        <aside className="h-fit rounded-lg border border-neutral-200 p-4">
          <h2 className="mb-3 font-semibold">{t.summary}</h2>
          <ul className="flex flex-col gap-3">
            {cart.items.map((item) => {
              const image = productImageUrl(item.image);
              return (
                <li key={item.item_id} className="flex gap-3 text-sm">
                  <ProductImage src={image} alt="" sizes="56px" className="size-14 shrink-0 rounded" />
                  <p className="flex-1">
                    {item.name}
                    <span className="block text-neutral-500">× {item.qty}</span>
                  </p>
                  <p>{formatPrice(Number(item.final_price) * Number(item.qty), lang)}</p>
                </li>
              );
            })}
          </ul>
        </aside>
      </div>
    </div>
  );
}
