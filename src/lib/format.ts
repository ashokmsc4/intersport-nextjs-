import type { Locale } from "@/i18n/config";

export function formatPrice(amount: number, locale: Locale) {
  // Latin digits in both languages; switch to "ar-KW" for Arabic-Indic digits.
  return new Intl.NumberFormat(locale === "ar" ? "ar-KW-u-nu-latn" : "en-KW", {
    style: "currency",
    currency: "KWD",
    minimumFractionDigits: 3,
  }).format(amount);
}
