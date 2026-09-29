import "server-only";
import type { Locale } from "@/i18n/config";
import { MagentoError, magentoRest } from "./client";

/** Which Magento cart a shopper is using. */
export type CartRef =
  | { kind: "guest"; maskedId: string }
  | { kind: "customer"; token: string };

export type CartItem = {
  item_id: string;
  qty: number;
  id: string;
  sku: string;
  type: string;
  name: string;
  brand: string | null;
  cart_custom_attributes?: {
    attribute_code: string;
    value: string;
    label: string;
  }[];
  price: string;
  final_price: string;
  image: string | null;
  is_salable: boolean;
  remaining_qty?: number;
};

export type CartTotals = {
  total: string;
  sub_total: string;
  subtotal_with_discount: string;
  shipping_amount: string | number;
  tax: string;
  points_discount?: string;
};

export type Cart = {
  quoteId: string;
  items: CartItem[];
  totals: CartTotals | null;
  coupon: string;
  count: number;
};

type CartListResponse = {
  status: number;
  message: string;
  totals?: CartTotals;
  items?: CartItem[];
  quote_id?: string;
}[];

// Every cart request carries the store's fulfilment source (required by the backend).
const SOURCE_CODE = "home_delivery";

const auth = (ref: CartRef) =>
  ref.kind === "customer"
    ? ({ type: "customer", token: ref.token } as const)
    : ({ type: "integration" } as const);

const basePath = (ref: CartRef) =>
  ref.kind === "guest"
    ? `V1/guest-carts/${encodeURIComponent(ref.maskedId)}`
    : "V1/carts/mine";

export function createGuestCart(locale: Locale) {
  return magentoRest<string>("V1/guest-carts", { locale, method: "POST" });
}

/** Returns the customer's active quote id, creating a cart if needed. */
export async function ensureCustomerQuoteId(locale: Locale, token: string) {
  const id = await magentoRest<number | string>("V1/carts/mine", {
    locale,
    auth: { type: "customer", token },
    method: "POST",
  });
  return String(id);
}

/** Numeric quote id (needed by cartlist and checkout), or null if no cart yet. */
export async function getQuoteId(locale: Locale, ref: CartRef) {
  try {
    const cart = await magentoRest<{ id: number }>(basePath(ref), {
      locale,
      auth: auth(ref),
      noStore: true,
    });
    return String(cart.id);
  } catch (error) {
    if (error instanceof MagentoError && error.status === 404) return null;
    throw error;
  }
}

const emptyCart = (quoteId = ""): Cart => ({
  quoteId,
  items: [],
  totals: null,
  coupon: "",
  count: 0,
});

/** Items and totals via the custom `cartlist` endpoint (includes images and sizes). */
export async function getCart(locale: Locale, ref: CartRef): Promise<Cart> {
  const quoteId = await getQuoteId(locale, ref);
  if (!quoteId) return emptyCart();

  const listId = ref.kind === "guest" ? ref.maskedId : quoteId;
  const [list, coupon] = await Promise.all([
    magentoRest<CartListResponse>(
      `V1/cartlist/${encodeURIComponent(listId)}`,
      { locale, auth: auth(ref), noStore: true },
    ),
    // Returns the code as a string, or [] when no coupon is applied.
    magentoRest<string | string[] | null>(`${basePath(ref)}/coupons`, {
      locale,
      auth: auth(ref),
      noStore: true,
    })
      .then((c) => (Array.isArray(c) ? (c[0] ?? "") : (c ?? "")))
      .catch(() => ""),
  ]);

  const data = list[0];
  const items = data?.items ?? [];
  return {
    quoteId,
    items,
    totals: data?.totals ?? null,
    coupon: String(coupon),
    count: items.reduce((sum, item) => sum + Number(item.qty), 0),
  };
}

export type AddItemInput = {
  sku: string;
  qty: number;
  /** For a size of a configurable product: parent SKU plus chosen options. */
  configurable?: {
    parentSku: string;
    options: { option_id: string; option_value: number }[];
  };
};

export function addItem(
  locale: Locale,
  ref: CartRef,
  quoteId: string,
  input: AddItemInput,
) {
  const cartItem = input.configurable
    ? {
        sku: input.configurable.parentSku,
        qty: input.qty,
        quote_id: ref.kind === "guest" ? ref.maskedId : quoteId,
        product_type: "configurable",
        product_option: {
          extension_attributes: {
            configurable_item_options: input.configurable.options,
          },
        },
        extension_attributes: { source_code: SOURCE_CODE },
      }
    : {
        sku: input.sku,
        qty: input.qty,
        quote_id: ref.kind === "guest" ? ref.maskedId : quoteId,
        extension_attributes: { source_code: SOURCE_CODE },
      };

  return magentoRest<{ item_id: number }>(`${basePath(ref)}/items`, {
    locale,
    auth: auth(ref),
    method: "POST",
    body: { cartItem },
  });
}

export function updateItemQty(
  locale: Locale,
  ref: CartRef,
  quoteId: string,
  item: { itemId: string; sku: string; qty: number },
) {
  return magentoRest(`${basePath(ref)}/items/${item.itemId}`, {
    locale,
    auth: auth(ref),
    method: "PUT",
    body: {
      cartItem: {
        sku: item.sku,
        qty: item.qty,
        quote_id: ref.kind === "guest" ? ref.maskedId : quoteId,
        extension_attributes: { source_code: SOURCE_CODE },
      },
    },
  });
}

export function removeItem(locale: Locale, ref: CartRef, itemId: string) {
  return magentoRest<boolean>(`${basePath(ref)}/items/${itemId}`, {
    locale,
    auth: auth(ref),
    method: "DELETE",
  });
}

export function applyCoupon(locale: Locale, ref: CartRef, code: string) {
  return magentoRest<boolean>(
    `${basePath(ref)}/coupons/${encodeURIComponent(code)}`,
    { locale, auth: auth(ref), method: "PUT" },
  );
}

export function removeCoupon(locale: Locale, ref: CartRef) {
  return magentoRest<boolean>(`${basePath(ref)}/coupons`, {
    locale,
    auth: auth(ref),
    method: "DELETE",
  });
}

/**
 * Moves a guest cart to a customer after login. Magento's assign replaces the
 * customer's active cart, so it is only used when that cart is empty; otherwise
 * the guest items are added to the customer's cart one by one.
 */
export async function mergeGuestCart(
  locale: Locale,
  maskedId: string,
  token: string,
  customer: { id: number; store_id: number },
) {
  const guestRef: CartRef = { kind: "guest", maskedId };
  const customerRef: CartRef = { kind: "customer", token };
  const guest = await getCart(locale, guestRef).catch(() => null);
  if (!guest || guest.items.length === 0) return;

  const current = await getCart(locale, customerRef).catch(() => null);
  if (!current || current.items.length === 0) {
    await magentoRest<boolean>(
      `V1/guest-carts/${encodeURIComponent(maskedId)}`,
      {
        locale,
        auth: auth(customerRef),
        method: "PUT",
        body: { customerId: customer.id, storeId: customer.store_id },
      },
    );
    return;
  }

  for (const item of guest.items) {
    await addItem(locale, customerRef, current.quoteId, {
      sku: item.sku,
      qty: Number(item.qty),
    }).catch((error) =>
      console.error(`[cart] could not move ${item.sku} to customer:`, error),
    );
  }
}
