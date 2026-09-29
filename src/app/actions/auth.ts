"use server";

import { redirect } from "next/navigation";
import { hasLocale, type Locale } from "@/i18n/config";
import { MagentoError } from "@/lib/magento/client";
import { getCart, mergeGuestCart } from "@/lib/magento/cart";
import { getCustomer, login, signup } from "@/lib/magento/customer";
import {
  clearGuestCart,
  clearSession,
  getGuestCartId,
  setCartCount,
  setCustomerName,
  setCustomerToken,
} from "@/lib/session";
import { safeRedirect } from "@/lib/shopper";

export type FormState =
  | {
      error?: string;
      field?: string;
      /** Submitted values (never passwords) so the form can be refilled after an error. */
      values?: Record<string, string>;
    }
  | undefined;

const text = (form: FormData, key: string) =>
  String(form.get(key) ?? "").trim();

function localeOf(form: FormData): Locale {
  const locale = text(form, "locale");
  return hasLocale(locale) ? locale : "en";
}

/** Stores the session, moves any guest cart to the customer and refreshes the cart count. */
async function startSession(locale: Locale, token: string) {
  const customer = await getCustomer(locale, token);
  await setCustomerToken(token);
  await setCustomerName(customer.firstname);

  const guestCart = await getGuestCartId();
  if (guestCart) {
    await mergeGuestCart(locale, guestCart, token, customer).catch((error) =>
      console.error("[auth] guest cart merge failed:", error),
    );
    await clearGuestCart();
  }
  const cart = await getCart(locale, { kind: "customer", token }).catch(
    () => null,
  );
  await setCartCount(cart?.count ?? 0);
}

export async function loginAction(
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const locale = localeOf(form);
  const email = text(form, "email");
  const password = String(form.get("password") ?? "");
  const values = { email };
  if (!email || !password) return { error: "required", values };

  try {
    const token = await login(locale, email, password);
    await startSession(locale, token);
  } catch (error) {
    if (error instanceof MagentoError) return { error: error.message, values };
    throw error;
  }
  redirect(safeRedirect(form.get("redirectTo"), `/${locale}/account`));
}

export async function signupAction(
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const locale = localeOf(form);
  const input = {
    firstname: text(form, "firstname"),
    lastname: text(form, "lastname"),
    email: text(form, "email"),
    password: String(form.get("password") ?? ""),
    dob: text(form, "dob"),
    gender: Number(text(form, "gender")),
    mobile: text(form, "mobile").replace(/\s+/g, ""),
  };
  const confirm = String(form.get("confirm") ?? "");
  const values = {
    firstname: input.firstname,
    lastname: input.lastname,
    email: input.email,
    dob: input.dob,
    gender: input.gender ? String(input.gender) : "",
    mobile: input.mobile,
  };

  if (Object.values(input).some((v) => v === "" || v === 0)) {
    return { error: "required", values };
  }
  if (!/^\+?\d{8,12}$/.test(input.mobile)) {
    return { error: "mobile", field: "mobile", values };
  }
  if (input.password.length < 8) {
    return { error: "passwordLength", field: "password", values };
  }
  if (input.password !== confirm) {
    return { error: "passwordMatch", field: "confirm", values };
  }

  try {
    await signup(locale, input);
    const token = await login(locale, input.email, input.password);
    await startSession(locale, token);
  } catch (error) {
    if (error instanceof MagentoError) return { error: error.message, values };
    throw error;
  }
  redirect(safeRedirect(form.get("redirectTo"), `/${locale}/account`));
}

export async function logoutAction(form: FormData) {
  const locale = localeOf(form);
  await clearSession();
  redirect(`/${locale}`);
}
