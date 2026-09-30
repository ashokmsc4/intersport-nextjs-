import "server-only";
import type { Locale } from "@/i18n/config";
import { MagentoError, magentoRest } from "./client";
import type { CartItem, CartRef } from "./cart";

export type Area = {
  area: string;
  area_name: string;
  source_code: string;
  stock_id: number;
};

/** Governorates with their delivery areas, e.g. { Hawalli: [{ area: "39", area_name: "Bayan" }] }. */
export async function getAreas(locale: Locale) {
  const data = await magentoRest<Record<string, Area[]>[]>("V1/aaw/arealist", {
    locale,
    tags: ["areas"],
  });
  return data.flatMap((group) =>
    Object.entries(group).map(([governorate, areas]) => ({
      governorate,
      areas: [...areas].sort((a, b) => a.area_name.localeCompare(b.area_name)),
    })),
  );
}

export type AddressInput = {
  firstname: string;
  lastname: string;
  email: string;
  telephone: string;
  governorate: string;
  areaId: string;
  areaName: string;
  block: string;
  street: string;
  avenue: string;
  house: string;
  floor: string;
  apartment: string;
};

/** Address in the shape the AAW checkout endpoints expect (Kuwait only). */
function toMagentoAddress(a: AddressInput) {
  return {
    region: a.governorate,
    country_id: "KW",
    region_id: "0",
    street: [a.street, a.avenue].filter(Boolean),
    postcode: "",
    city_id: a.areaId,
    city: a.areaName,
    firstname: a.firstname,
    lastname: a.lastname,
    email: a.email,
    telephone: a.telephone,
    block: a.block,
    house: a.house,
    floor: a.floor,
    apartment: a.apartment,
    same_as_billing: 1,
    extension_attributes: { house: a.house, building_number: a.house },
  };
}

export type PaymentMethod = {
  title: string;
  code: string;
  cod_price: string;
  /** Sub-options such as { knet: "KNET", CC: "VISA / MASTER CARD" }. */
  gateways: Record<string, string>[];
};

export type ShippingMethod = { title: string; code: string; cost: string | number };

export type CheckoutTotals = {
  subtotal: string;
  discount_amount: string;
  coupon_code: string;
  shipping_amount: string;
  tax: string;
  grand_total: string;
};

export type FinalizeResult = {
  quote_id: string;
  items: CartItem[];
  payment_methods: PaymentMethod[];
  shipping_methods: ShippingMethod[];
  totals: CheckoutTotals;
  promotion_message?: string;
};

type Envelope<T> = { status: number; message: string; data?: T }[];

function unwrap<T>(response: Envelope<T>): T {
  const first = response[0];
  if (!first || first.status !== 200 || !first.data) {
    throw new MagentoError(first?.message || "Checkout failed");
  }
  return first.data;
}

const checkoutAuth = (ref: CartRef) =>
  ref.kind === "customer"
    ? ({ type: "customer", token: ref.token } as const)
    : ({ type: "integration" } as const);

/** Step 1: saves the address and returns shipping and payment options with totals. */
export async function finalizeCheckout(
  locale: Locale,
  ref: CartRef,
  input: {
    quoteId: string;
    customerId?: number;
    address: AddressInput;
    note: string;
  },
) {
  const address = toMagentoAddress(input.address);
  const body = {
    ...(ref.kind === "guest"
      ? { guest_checkout: 1 }
      : { customer_id: input.customerId }),
    cart_id: input.quoteId,
    billing_address: address,
    shipping_address: address,
    customer_note: input.note,
    platform: "Web",
  };
  return unwrap(
    await magentoRest<Envelope<FinalizeResult>>("V1/finalize-checkout", {
      locale,
      auth: checkoutAuth(ref),
      method: "POST",
      body,
    }),
  );
}

export type PlacedOrder = {
  /** Present for online payments: send the shopper here to pay. */
  payment_url?: string;
  order_id: string;
  status: string;
  order_date?: string;
};

/** Step 2: places the order. */
export async function placeOrder(
  locale: Locale,
  ref: CartRef,
  input: {
    quoteId: string;
    address: AddressInput;
    billing?: AddressInput;
    note: string;
    paymentMethod: string;
    gateway: string;
    shippingMethod: string;
  },
) {
  const address = toMagentoAddress(input.address);
  const billing = input.billing
    ? { ...toMagentoAddress(input.billing), same_as_billing: 0 }
    : address;
  return unwrap(
    await magentoRest<Envelope<PlacedOrder>>("V1/do-checkout", {
      locale,
      auth: checkoutAuth(ref),
      method: "POST",
      body: {
        cart_id: input.quoteId,
        payment_method: input.paymentMethod,
        gateway: input.gateway,
        shipping_method: input.shippingMethod,
        customer_note: input.note,
        billing_address: billing,
        shipping_address: address,
      },
    }),
  );
}
