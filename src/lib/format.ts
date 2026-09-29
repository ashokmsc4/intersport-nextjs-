import type { Locale } from "@/i18n/config";

export function formatPrice(amount: number, locale: Locale) {
  return new Intl.NumberFormat(locale === "ar" ? "ar-KW" : "en-KW", {
    style: "currency",
    currency: "KWD",
    minimumFractionDigits: 3,
  }).format(amount);
}
