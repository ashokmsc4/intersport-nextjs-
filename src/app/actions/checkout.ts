"use server";

import { hasLocale, type Locale } from "@/i18n/config";
import { MagentoError } from "@/lib/magento/client";
import { getQuoteId } from "@/lib/magento/cart";
import {
  finalizeCheckout,
  placeOrder,
  type AddressInput,
  type FinalizeResult,
} from "@/lib/magento/checkout";
import { getCustomer } from "@/lib/magento/customer";
import { clearGuestCart, setCartCount } from "@/lib/session";
import { currentCartRef } from "@/lib/shopper";

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

const REQUIRED: (keyof AddressInput)[] = [
  "firstname",
  "lastname",
  "email",
  "telephone",
  "governorate",
  "areaId",
  "areaName",
  "block",
  "street",
  "house",
];

/** Trims every field and checks the ones delivery needs. */
function cleanAddress(raw: AddressInput): AddressInput | string {
  const address = Object.fromEntries(
    Object.entries(raw).map(([k, v]) => [k, String(v ?? "").trim()]),
  ) as AddressInput;
  if (REQUIRED.some((key) => !address[key])) return "required";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address.email)) return "email";
  if (!/^\+?\d{8,12}$/.test(address.telephone.replace(/\s+/g, ""))) {
    return "mobile";
  }
  return address;
}

async function checkoutContext(locale: Locale) {
  const ref = await currentCartRef();
  if (!ref) return null;
  const quoteId = await getQuoteId(locale, ref);
  if (!quoteId) return null;
  const customerId =
    ref.kind === "customer"
      ? (await getCustomer(locale, ref.token)).id
      : undefined;
  return { ref, quoteId, customerId };
}

export type ReviewData = Pick<
  FinalizeResult,
  "payment_methods" | "shipping_methods" | "totals" | "promotion_message"
>;

/** Step 1: validate the address and fetch shipping/payment options and totals. */
export async function reviewCheckoutAction(input: {
  locale: string;
  address: AddressInput;
  note: string;
}): Promise<Result<ReviewData>> {
  const locale = hasLocale(input.locale) ? input.locale : "en";
  const address = cleanAddress(input.address);
  if (typeof address === "string") return { ok: false, error: address };

  try {
    const context = await checkoutContext(locale);
    if (!context) return { ok: false, error: "emptyCart" };
    const result = await finalizeCheckout(locale, context.ref, {
      quoteId: context.quoteId,
      customerId: context.customerId,
      address,
      note: input.note.trim(),
    });
    return {
      ok: true,
      data: {
        payment_methods: result.payment_methods,
        shipping_methods: result.shipping_methods,
        totals: result.totals,
        promotion_message: result.promotion_message,
      },
    };
  } catch (error) {
    if (error instanceof MagentoError) return { ok: false, error: error.message };
    throw error;
  }
}

/**
 * Step 2: place the order. Online payments return a gateway URL to redirect to;
 * cash on delivery returns the order number directly.
 */
export async function placeOrderAction(input: {
  locale: string;
  address: AddressInput;
  note: string;
  paymentMethod: string;
  gateway: string;
  shippingMethod: string;
}): Promise<Result<{ orderId: string; paymentUrl?: string }>> {
  const locale = hasLocale(input.locale) ? input.locale : "en";
  const address = cleanAddress(input.address);
  if (typeof address === "string") return { ok: false, error: address };
  if (!input.paymentMethod || !input.shippingMethod) {
    return { ok: false, error: "choosePayment" };
  }

  try {
    const context = await checkoutContext(locale);
    if (!context) return { ok: false, error: "emptyCart" };
    const order = await placeOrder(locale, context.ref, {
      quoteId: context.quoteId,
      address,
      note: input.note.trim(),
      paymentMethod: input.paymentMethod,
      gateway: input.gateway,
      shippingMethod: input.shippingMethod,
    });
    // The quote becomes an order; the next add-to-cart starts a new cart.
    if (context.ref.kind === "guest") await clearGuestCart();
    await setCartCount(0);
    return {
      ok: true,
      data: { orderId: order.order_id, paymentUrl: order.payment_url },
    };
  } catch (error) {
    if (error instanceof MagentoError) return { ok: false, error: error.message };
    throw error;
  }
}
