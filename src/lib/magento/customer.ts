import "server-only";
import type { Locale } from "@/i18n/config";
import { magentoRest } from "./client";

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
