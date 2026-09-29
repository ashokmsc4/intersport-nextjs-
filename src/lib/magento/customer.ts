import "server-only";
import type { Locale } from "@/i18n/config";
import { MagentoError, magentoRest } from "./client";

export type Customer = {
  id: number;
  email: string;
  firstname: string;
  lastname: string;
  store_id: number;
  website_id: number;
  dob?: string;
  gender?: number;
  custom_attributes?: { attribute_code: string; value: string }[];
};

export const customerMobile = (customer: Customer) =>
  customer.custom_attributes?.find((a) => a.attribute_code === "mobilenumber")
    ?.value ?? "";

export function login(locale: Locale, email: string, password: string) {
  return magentoRest<string>("V1/integration/customer/token", {
    locale,
    auth: { type: "none" },
    method: "POST",
    body: { username: email, password },
  });
}

export type SignupInput = {
  email: string;
  password: string;
  firstname: string;
  lastname: string;
  /** YYYY-MM-DD */
  dob: string;
  /** 1 male, 2 female, 3 rather not say */
  gender: number;
  mobile: string;
};

/** Intersport requires date of birth, gender and mobile number (`mobilenumber`). */
export function signup(locale: Locale, input: SignupInput) {
  return magentoRest<Customer>("V1/customers", {
    locale,
    auth: { type: "none" },
    method: "POST",
    body: {
      customer: {
        email: input.email,
        firstname: input.firstname,
        lastname: input.lastname,
        dob: input.dob,
        gender: input.gender,
        custom_attributes: [
          { attribute_code: "mobilenumber", value: input.mobile },
        ],
      },
      password: input.password,
    },
  });
}

export function getCustomer(locale: Locale, token: string) {
  return magentoRest<Customer>("V1/customers/me", {
    locale,
    auth: { type: "customer", token },
  });
}

// Website id for password reset emails (Intersport is website 3 on staging and production).
const WEBSITE_ID = Number(process.env.MAGENTO_WEBSITE_ID ?? 3);

/** Sends Magento's reset-password email. Resolves even when no account exists. */
export async function requestPasswordReset(locale: Locale, email: string) {
  try {
    await magentoRest<boolean>("V1/customers/password", {
      locale,
      auth: { type: "none" },
      method: "PUT",
      body: { email, template: "email_reset", websiteId: WEBSITE_ID },
    });
  } catch (error) {
    // Don't reveal whether an account exists for this email.
    if (error instanceof MagentoError && error.status === 404) return;
    throw error;
  }
}

export type OrderItem = {
  item_id: number;
  name: string;
  sku: string;
  qty_ordered: number;
  price: number;
  row_total: number;
  product_type: string;
  parent_item_id?: number;
};

export type OrderAddress = {
  firstname: string;
  lastname: string;
  street?: string[];
  city?: string;
  region?: string;
  telephone?: string;
};

export type Order = {
  entity_id: number;
  increment_id: string;
  created_at: string;
  status: string;
  state?: string;
  grand_total: number;
  subtotal: number;
  shipping_amount: number;
  discount_amount: number;
  order_currency_code: string;
  shipping_description?: string;
  items?: OrderItem[];
  payment?: { method: string; additional_information?: string[] };
  billing_address?: OrderAddress;
  extension_attributes?: {
    shipping_assignments?: { shipping?: { address?: OrderAddress } }[];
  };
};

type OrderSearch = { items: Order[]; total_count: number };

/** The signed-in customer's orders, newest first (the endpoint scopes to the token). */
export function getOrders(
  locale: Locale,
  token: string,
  { page = 1, pageSize = 10 }: { page?: number; pageSize?: number } = {},
) {
  const q = new URLSearchParams();
  q.set("searchCriteria[sortOrders][0][field]", "created_at");
  q.set("searchCriteria[sortOrders][0][direction]", "DESC");
  q.set("searchCriteria[pageSize]", String(pageSize));
  q.set("searchCriteria[currentPage]", String(page));
  return magentoRest<OrderSearch>("V1/mstore/me/orders", {
    locale,
    auth: { type: "customer", token },
    query: q,
  });
}

export async function getOrder(locale: Locale, token: string, incrementId: string) {
  const q = new URLSearchParams();
  q.set("searchCriteria[filter_groups][0][filters][0][field]", "increment_id");
  q.set("searchCriteria[filter_groups][0][filters][0][value]", incrementId);
  q.set("searchCriteria[filter_groups][0][filters][0][condition_type]", "eq");
  q.set("searchCriteria[pageSize]", "1");
  const result = await magentoRest<OrderSearch>("V1/mstore/me/orders", {
    locale,
    auth: { type: "customer", token },
    query: q,
  });
  // Double-check the match: the list is already scoped to this customer.
  return result.items.find((o) => o.increment_id === incrementId) ?? null;
}

export type SavedAddress = {
  address_id: string;
  firstname: string;
  lastname: string;
  region: string;
  city: string;
  city_id: string;
  street: string;
  address_line_1: string;
  telephone: string;
  floor_number: string | null;
  apartment_number: string | null;
  building_number: string | null;
  block: string;
  is_default_shipping: number;
};

type AddressEnvelope = { status: number; message?: string; data?: SavedAddress[] }[];

/** Always pass the id of the signed-in customer (from `customers/me`), never user input. */
export async function getAddresses(locale: Locale, token: string, customerId: number) {
  const data = await magentoRest<AddressEnvelope>(
    `V3/customer/address/${customerId}`,
    { locale, auth: { type: "customer", token } },
  );
  return data[0]?.data ?? [];
}

export type NewAddress = {
  firstname: string;
  lastname: string;
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
  isDefault: boolean;
};

export async function createAddress(
  locale: Locale,
  token: string,
  customerId: number,
  a: NewAddress,
) {
  const data = await magentoRest<AddressEnvelope>("V3/customer/address", {
    locale,
    auth: { type: "customer", token },
    method: "POST",
    query: new URLSearchParams({ lang: locale }),
    body: {
      prefix: "",
      customer_id: String(customerId),
      firstname: a.firstname,
      lastname: a.lastname,
      country_id: "KW",
      region_id: 0,
      region: a.governorate,
      city: a.areaName,
      cityId: a.areaId,
      street: a.street,
      address_line_1: a.avenue,
      address_line_2: "",
      phone_code: "",
      telephone: a.telephone,
      postcode: "",
      floor_number: a.floor,
      apartment_number: a.apartment,
      building_number: a.house,
      block: a.block,
      is_default_billing: a.isDefault ? 1 : 0,
      is_default_shipping: a.isDefault ? 1 : 0,
    },
  });
  if (data[0]?.status !== 200) {
    throw new MagentoError(data[0]?.message || "Could not save the address");
  }
}

export function deleteAddress(locale: Locale, token: string, addressId: string) {
  return magentoRest(`V3/customer/address/${encodeURIComponent(addressId)}`, {
    locale,
    auth: { type: "customer", token },
    method: "DELETE",
  });
}
