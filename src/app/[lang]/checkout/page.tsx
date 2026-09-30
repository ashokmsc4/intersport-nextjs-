import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { productImageUrl } from "@/lib/magento/client";
import { getCart, pickupStoreName } from "@/lib/magento/cart";
import { getAreas, type AddressInput } from "@/lib/magento/checkout";
import {
  customerMobile,
  getAddresses,
  getCustomer,
  type SavedAddress,
} from "@/lib/magento/customer";
import { addressLine } from "@/lib/addresses";
import { currentCartRef } from "@/lib/shopper";
import { CheckoutForm, type SavedChoice } from "@/components/checkout/CheckoutForm";

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
  if (!ref) redirect(`/${lang}/cart`);

  // Everything at once: the cart (with its coupon, shown in the summary), delivery
  // areas, and the customer with their saved addresses.
  const customerData =
    ref.kind === "customer"
      ? getCustomer(lang, ref.token)
          .then(async (customer) => ({
            customer,
            addresses: await getAddresses(lang, ref.token, customer.id).catch(() => [] as SavedAddress[]),
          }))
          .catch(() => ({ customer: null, addresses: [] as SavedAddress[] }))
      : Promise.resolve({ customer: null, addresses: [] as SavedAddress[] });
  const [cart, dict, governorates, { customer, addresses }] = await Promise.all([
    getCart(lang, ref, { withCoupon: true }).catch(() => null),
    getDictionary(lang),
    getAreas(lang),
    customerData,
  ]);
  if (!cart || cart.items.length === 0) redirect(`/${lang}/cart`);
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
  const totals = cart.totals;
  const subtotal = Number(totals?.sub_total ?? 0);
  const afterDiscount = Number(totals?.subtotal_with_discount ?? subtotal);

  return (
    <div className="-my-8 bg-[#efefef] py-8 shadow-[0_0_0_100vmax_#efefef] [clip-path:inset(0_-100vmax)]">
      <h1 className="sr-only">{t.title}</h1>
      <CheckoutForm
        locale={lang}
        governorates={governorates}
        prefill={prefill}
        saved={saved}
        preferPickup={cart.items.some((i) => pickupStoreName(i) !== null)}
        items={cart.items.map((item) => ({
          id: item.item_id,
          name: item.name,
          qty: Number(item.qty),
          price: Number(item.final_price) * Number(item.qty),
          image: productImageUrl(item.image),
        }))}
        cartTotals={{
          subtotal,
          discount: afterDiscount - subtotal,
          total: Number(totals?.total ?? afterDiscount),
        }}
        coupon={cart.coupon}
        notice={
          ref.kind === "guest" && (
            <p className="rounded-lg bg-white p-4 text-sm">
              {t.guestNote}{" "}
              <Link
                href={`/${lang}/account/login?next=/${lang}/checkout`}
                className="font-semibold text-brand underline"
              >
                {t.signInFaster}
              </Link>
            </p>
          )
        }
        dict={{
          addresses: dict.addresses,
          checkout: dict.checkout,
          account: dict.account,
          cart: dict.cart,
          errors: dict.errors,
        }}
      />
    </div>
  );
}
