"use server";

import { refresh } from "next/cache";
import { hasLocale, type Locale } from "@/i18n/config";
import { MagentoError } from "@/lib/magento/client";
import {
  addItem,
  applyCoupon,
  createGuestCart,
  ensureCustomerQuoteId,
  getCart,
  getQuoteId,
  removeCoupon,
  removeItem,
  updateItemQty,
  HOME_DELIVERY,
  pickupStoreName,
  type AddItemInput,
  type CartRef,
} from "@/lib/magento/cart";
import { productImageUrl } from "@/lib/magento/client";
import { getPickupAvailability, type PickupStore } from "@/lib/magento/pickup";
import {
  clearGuestCart,
  clearSession,
  getCartCount,
  setCartCount,
  setGuestCartId,
} from "@/lib/session";
import { currentCartRef } from "@/lib/shopper";

export type CartActionState =
  /** `count` is the new item count when the action knows it (the drawer reloads otherwise). */
  | { ok: true; count?: number }
  | { ok: false; error: string }
  | undefined;

/** Turns API errors into a message; an expired login ends the session. */
async function failure(error: unknown): Promise<CartActionState> {
  if (!(error instanceof MagentoError)) throw error;
  if (error.status === 401) {
    await clearSession();
    return { ok: false, error: "sessionExpired" };
  }
  return { ok: false, error: error.message };
}

const text = (form: FormData, key: string) =>
  String(form.get(key) ?? "").trim();

/** "home_delivery" or a numeric pickup store id; anything else means home delivery. */
function sourceCodeOf(form: FormData) {
  const value = text(form, "sourceCode");
  return /^\d+$/.test(value) ? value : HOME_DELIVERY;
}

function localeOf(form: FormData): Locale {
  const locale = text(form, "locale");
  return hasLocale(locale) ? locale : "en";
}

/** Configurable options posted by the size picker; anything malformed is ignored. */
function parseOptions(raw: string) {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    const options = parsed.map((o) => ({
      option_id: String(o?.option_id ?? ""),
      option_value: Number(o?.option_value),
    }));
    return options.every((o) => /^\d+$/.test(o.option_id) && o.option_value > 0)
      ? options
      : null;
  } catch {
    return null;
  }
}

/** Guest cart to add to: the saved one, or a new one when there is none. */
async function newGuestCart(locale: Locale): Promise<CartRef> {
  const maskedId = await createGuestCart(locale);
  await setGuestCartId(maskedId);
  return { kind: "guest", maskedId };
}

const status = (error: unknown) => (error instanceof MagentoError ? error.status : undefined);

export async function addToCartAction(
  _prev: CartActionState,
  form: FormData,
): Promise<CartActionState> {
  const locale = localeOf(form);
  const sku = text(form, "sku");
  const qty = Math.max(1, Math.min(10, Number(text(form, "qty")) || 1));
  if (!sku) return { ok: false, error: "chooseSize" };

  const input: AddItemInput = { sku, qty, sourceCode: sourceCodeOf(form) };
  const parentSku = text(form, "parentSku");
  const options = parseOptions(text(form, "options"));
  if (parentSku && options) {
    input.configurable = { parentSku, options };
  }

  // One Magento call in the usual case: guests add with the masked cart id, customers
  // to their active cart. A missing cart (expired, ordered) is created and the add retried.
  // The drawer then loads the cart (and the header count) once.
  try {
    const ref = (await currentCartRef()) ?? (await newGuestCart(locale));
    try {
      await addItem(locale, ref, "", input);
    } catch (error) {
      // Customers: retry with the active quote id (created if needed). Guests: only a
      // 404 means the cart is gone; other errors (stock, options) must not replace it.
      if (ref.kind === "customer") {
        if (status(error) !== 400 && status(error) !== 404) throw error;
        await addItem(locale, ref, await ensureCustomerQuoteId(locale, ref.token), input);
      } else {
        if (status(error) !== 404) throw error;
        await clearGuestCart();
        await addItem(locale, await newGuestCart(locale), "", input);
      }
    }
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

async function withCart(
  form: FormData,
  change: (locale: Locale, ref: CartRef) => Promise<unknown>,
): Promise<CartActionState> {
  const locale = localeOf(form);
  const ref = await currentCartRef();
  if (!ref) return { ok: false, error: "emptyCart" };
  try {
    await change(locale, ref);
    // New count without re-reading the cart: the form says how the line changed.
    const delta = Number(text(form, "countDelta")) || 0;
    const count = Math.max(0, (await getCartCount()) + delta);
    await setCartCount(count);
    // Re-render the page behind the form (the cart page); the drawer skips this elsewhere.
    if (text(form, "refresh") !== "0") refresh();
    return { ok: true, count };
  } catch (error) {
    return failure(error);
  }
}

export async function updateQtyAction(
  _prev: CartActionState,
  form: FormData,
): Promise<CartActionState> {
  return withCart(form, async (locale, ref) => {
    // Guests address the cart by its masked id; only customers need the quote id.
    const quoteId = ref.kind === "customer" ? ((await getQuoteId(locale, ref)) ?? "") : "";
    const qty = Math.max(1, Math.min(10, Number(text(form, "qty")) || 1));
    await updateItemQty(locale, ref, quoteId, {
      itemId: text(form, "itemId"),
      sku: text(form, "sku"),
      qty,
      sourceCode: sourceCodeOf(form),
    });
  });
}

export async function removeItemAction(
  _prev: CartActionState,
  form: FormData,
): Promise<CartActionState> {
  return withCart(form, (locale, ref) =>
    removeItem(locale, ref, text(form, "itemId")),
  );
}

export async function couponAction(
  _prev: CartActionState,
  form: FormData,
): Promise<CartActionState> {
  return withCart(form, (locale, ref) => {
    if (text(form, "remove")) return removeCoupon(locale, ref);
    const code = text(form, "code");
    if (!code) throw new MagentoError("coupon");
    return applyCoupon(locale, ref, code);
  });
}

/** Pickup stores with stock for a product id (a size's child id for configurables). */
export async function pickupAvailabilityAction(
  locale: string,
  productId: string,
): Promise<{ homeDelivery: boolean; stores: PickupStore[] } | null> {
  if (!/^\d+$/.test(productId)) return null;
  const safeLocale = hasLocale(locale) ? locale : "en";
  return getPickupAvailability(safeLocale, productId).catch((error) => {
    console.error("[pickup] availability failed:", error);
    return null;
  });
}

export type MiniCartLine = {
  itemId: string;
  sku: string;
  name: string;
  brand: string | null;
  image: string | null;
  qty: number;
  maxQty: number;
  lineTotal: number;
  lineBefore: number;
  size: string | null;
  color: string | null;
  sourceCode: string;
  pickupStore: string | null;
};

export type MiniCart = { lines: MiniCartLine[]; subtotal: number; total: number; count: number };

/** Current cart for the side drawer (plain data, safe to send to the browser). */
export async function miniCartAction(locale: string): Promise<MiniCart> {
  const safeLocale = hasLocale(locale) ? locale : "en";
  const empty: MiniCart = { lines: [], subtotal: 0, total: 0, count: 0 };
  const ref = await currentCartRef();
  if (!ref) return empty;
  const cart = await getCart(safeLocale, ref).catch(() => null);
  if (!cart) return empty;
  // Keeps the header count (read from this cookie by /api/session) in step.
  await setCartCount(cart.count);

  const label = (item: (typeof cart.items)[number], code: string) =>
    item.cart_custom_attributes?.find((a) => a.attribute_code === code)?.label || null;
  return {
    lines: cart.items.map((item) => {
      const qty = Number(item.qty);
      const size = label(item, "size");
      return {
        itemId: item.item_id,
        sku: item.sku,
        name: item.name,
        brand: item.brand,
        image: productImageUrl(item.image),
        qty,
        maxQty: Number(item.remaining_qty ?? 10),
        lineTotal: Number(item.final_price) * qty,
        lineBefore: Number(item.price) * qty,
        size: size === "One Size" ? null : size,
        color: label(item, "color"),
        sourceCode: String(item.source_code ?? HOME_DELIVERY),
        pickupStore: pickupStoreName(item),
      };
    }),
    subtotal: Number(cart.totals?.sub_total ?? 0),
    total: Number(cart.totals?.total ?? 0),
    count: cart.count,
  };
}
