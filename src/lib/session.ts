import "server-only";
import { cookies } from "next/headers";

/**
 * Shopper session kept in httpOnly cookies, so tokens never reach browser JS.
 * - customer token: Magento customer access token after login
 * - guest cart: masked guest cart id before login
 * - cart count: item count for the header badge (avoids an API call per page)
 */
const CUSTOMER_TOKEN = "is_customer";
const GUEST_CART = "is_guest_cart";
const CART_COUNT = "is_cart_count";
const CUSTOMER_NAME = "is_customer_name";

const baseOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

export async function getCustomerToken() {
  return (await cookies()).get(CUSTOMER_TOKEN)?.value;
}

export async function setCustomerToken(token: string) {
  (await cookies()).set(CUSTOMER_TOKEN, token, {
    ...baseOptions,
    maxAge: 60 * 60 * 24 * 7,
  });
}

/** First name for the header greeting, so pages don't call the API for it. */
export async function getCustomerName() {
  return (await cookies()).get(CUSTOMER_NAME)?.value;
}

export async function setCustomerName(name: string) {
  (await cookies()).set(CUSTOMER_NAME, name, {
    ...baseOptions,
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function getGuestCartId() {
  return (await cookies()).get(GUEST_CART)?.value;
}

export async function setGuestCartId(maskedId: string) {
  (await cookies()).set(GUEST_CART, maskedId, {
    ...baseOptions,
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function getCartCount() {
  return Number((await cookies()).get(CART_COUNT)?.value ?? 0) || 0;
}

export async function setCartCount(count: number) {
  (await cookies()).set(CART_COUNT, String(count), {
    ...baseOptions,
    maxAge: 60 * 60 * 24 * 30,
  });
}

/** Forget the guest cart (after checkout or once it moved to a customer). */
export async function clearGuestCart() {
  const store = await cookies();
  store.delete(GUEST_CART);
}

export async function clearSession() {
  const store = await cookies();
  store.delete(CUSTOMER_TOKEN);
  store.delete(CUSTOMER_NAME);
  store.delete(GUEST_CART);
  store.delete(CART_COUNT);
}
