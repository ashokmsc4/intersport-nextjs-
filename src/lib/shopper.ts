import "server-only";
import { redirect } from "next/navigation";
import type { Locale } from "@/i18n/config";
import type { CartRef } from "@/lib/magento/cart";
import { MagentoError } from "@/lib/magento/client";
import { getCustomer } from "@/lib/magento/customer";
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

/**
 * Signed-in customer for account pages; sends everyone else (or an expired
 * token) to the sign-in page and back to `path` afterwards.
 */
export async function requireCustomer(locale: Locale, path: string) {
  const loginUrl = `/${locale}/account/login?next=${encodeURIComponent(path)}`;
  const token = await getCustomerToken();
  if (!token) redirect(loginUrl);
  const customer = await getCustomer(locale, token).catch((error) => {
    if (error instanceof MagentoError && error.status === 401) return null;
    throw error;
  });
  if (!customer) redirect(loginUrl);
  return { token, customer };
}
