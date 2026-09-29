"use server";

import { refresh } from "next/cache";
import { hasLocale, type Locale } from "@/i18n/config";
import { MagentoError } from "@/lib/magento/client";
import {
  createAddress,
  deleteAddress,
  getAddresses,
  getCustomer,
  requestPasswordReset,
} from "@/lib/magento/customer";
import { getCustomerToken } from "@/lib/session";

export type AccountState =
  | { ok: true; message?: string; savedAt?: number }
  | { ok: false; error: string; values?: Record<string, string> }
  | undefined;

const text = (form: FormData, key: string) =>
  String(form.get(key) ?? "").trim();

function localeOf(form: FormData): Locale {
  const locale = text(form, "locale");
  return hasLocale(locale) ? locale : "en";
}

/** The signed-in customer, resolved from the session cookie, never from the form. */
async function signedIn(locale: Locale) {
  const token = await getCustomerToken();
  if (!token) return null;
  const customer = await getCustomer(locale, token).catch(() => null);
  return customer ? { token, customer } : null;
}

export async function addAddressAction(
  _prev: AccountState,
  form: FormData,
): Promise<AccountState> {
  const locale = localeOf(form);
  const address = {
    firstname: text(form, "firstname"),
    lastname: text(form, "lastname"),
    telephone: text(form, "telephone").replace(/\s+/g, ""),
    governorate: text(form, "governorate"),
    areaId: text(form, "areaId"),
    areaName: text(form, "areaName"),
    block: text(form, "block"),
    street: text(form, "street"),
    avenue: text(form, "avenue"),
    house: text(form, "house"),
    floor: text(form, "floor"),
    apartment: text(form, "apartment"),
    isDefault: form.get("isDefault") === "on",
  };
  // Echoed back so the form keeps what was typed after an error.
  const values = Object.fromEntries(
    Object.entries(address).filter(([key]) => key !== "isDefault"),
  ) as Record<string, string>;
  const required = ["firstname", "lastname", "telephone", "governorate", "areaId", "block", "street", "house"] as const;
  if (required.some((key) => !address[key])) return { ok: false, error: "required", values };
  if (!/^\+?\d{8,12}$/.test(address.telephone)) return { ok: false, error: "mobile", values };

  const session = await signedIn(locale);
  if (!session) return { ok: false, error: "sessionExpired" };
  try {
    await createAddress(locale, session.token, session.customer.id, address);
  } catch (error) {
    if (error instanceof MagentoError) return { ok: false, error: error.message, values };
    throw error;
  }
  refresh();
  // A fresh value per save lets the form remount and start empty each time.
  return { ok: true, savedAt: Date.now() };
}

export async function deleteAddressAction(
  _prev: AccountState,
  form: FormData,
): Promise<AccountState> {
  const locale = localeOf(form);
  const addressId = text(form, "addressId");
  const session = await signedIn(locale);
  if (!session) return { ok: false, error: "sessionExpired" };

  // The backend doesn't check ownership, so only delete the customer's own addresses.
  const own = await getAddresses(locale, session.token, session.customer.id);
  if (!own.some((a) => a.address_id === addressId)) {
    return { ok: false, error: "generic" };
  }
  try {
    await deleteAddress(locale, session.token, addressId);
  } catch (error) {
    if (error instanceof MagentoError) return { ok: false, error: error.message };
    throw error;
  }
  refresh();
  return { ok: true };
}

export async function passwordResetAction(
  _prev: AccountState,
  form: FormData,
): Promise<AccountState> {
  const locale = localeOf(form);
  const email = text(form, "email");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "email", values: { email } };
  }
  try {
    await requestPasswordReset(locale, email);
  } catch (error) {
    if (error instanceof MagentoError) return { ok: false, error: error.message, values: { email } };
    throw error;
  }
  return { ok: true, message: email };
}
