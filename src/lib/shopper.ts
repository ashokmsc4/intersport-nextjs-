import "server-only";
import type { CartRef } from "@/lib/magento/cart";
import { getCustomerToken, getGuestCartId } from "@/lib/session";

/** The cart for the current request: the customer's if logged in, else the guest cart. */
export async function currentCartRef(): Promise<CartRef | null> {
  const token = await getCustomerToken();
  if (token) return { kind: "customer", token };
  const maskedId = await getGuestCartId();
  return maskedId ? { kind: "guest", maskedId } : null;
}

/** Only allow same-site relative redirects such as `/en/checkout`. */
export function safeRedirect(target: FormDataEntryValue | null, fallback: string) {
  const value = typeof target === "string" ? target : "";
  return value.startsWith("/") && !value.startsWith("//") ? value : fallback;
}
