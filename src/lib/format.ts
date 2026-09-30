import type { Locale } from "@/i18n/config";

export function formatPrice(amount: number, locale: Locale, { trim = false } = {}) {
  // Latin digits in both languages; switch to "ar-KW" for Arabic-Indic digits.
  return new Intl.NumberFormat(locale === "ar" ? "ar-KW-u-nu-latn" : "en-KW", {
    style: "currency",
    currency: "KWD",
    // `trim` drops trailing zeros (KWD 20 instead of KWD 20.000) where space is tight.
    minimumFractionDigits: trim ? 0 : 3,
    maximumFractionDigits: 3,
  }).format(amount);
}
