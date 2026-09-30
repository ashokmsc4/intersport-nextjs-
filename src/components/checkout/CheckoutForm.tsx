"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  placeOrderAction,
  reviewCheckoutAction,
  type ReviewData,
} from "@/app/actions/checkout";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { errorText } from "@/i18n/errors";
import type { AddressInput } from "@/lib/magento/checkout";
import { formatPrice } from "@/lib/format";
import { resolveArea } from "@/lib/areas";
import { CouponForm } from "@/components/cart/CouponForm";
import { ProductImage } from "@/components/ProductImage";
import { Field, FormError } from "@/components/forms/Field";
import { AreaSelect, type Governorate } from "@/components/account/AreaSelect";
import {
  CheckoutStepper,
  PaymentOptions,
  ShippingOptions,
  optionClass,
  paymentChoices,
  type PaymentChoice,
} from "./CheckoutSteps";

/** A saved address already mapped to checkout fields, with a display label. */
export type SavedChoice = { id: string; label: string; address: Partial<AddressInput> };

/** One cart line in the order summary. */
export type SummaryLine = { id: string; name: string; qty: number; price: number; image: string | null };

/** Cart totals before shipping is chosen (from the cart; refreshed after a coupon change). */
export type CartSummaryTotals = { subtotal: number; discount: number; total: number };

const FORM_ID = "checkout-form";

const emptyAddress: AddressInput = {
  firstname: "",
  lastname: "",
  email: "",
  telephone: "",
  governorate: "",
  areaId: "",
  areaName: "",
  block: "",
  street: "",
  avenue: "",
  house: "",
  floor: "",
  apartment: "",
};

/** Delivery fields cleared when switching between saved addresses. */
const emptyDelivery: Partial<AddressInput> = {
  governorate: "",
  areaId: "",
  areaName: "",
  block: "",
  street: "",
  avenue: "",
  house: "",
  floor: "",
  apartment: "",
};

/** "October 1, 2026" in Kuwait time, for the next-day delivery estimate. */
function tomorrowLabel(locale: Locale) {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-KW" : "en-US", {
    timeZone: "Asia/Kuwait",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(Date.now() + 24 * 60 * 60 * 1000));
}

/**
 * Two-step checkout (Address, then Payment) beside an order summary that holds
 * the coupon, the totals and the step's Back / Continue buttons.
 */
export function CheckoutForm({
  locale,
  governorates,
  prefill,
  saved = [],
  preferPickup = false,
  items,
  cartTotals,
  coupon,
  notice,
  dict,
}: {
  locale: Locale;
  governorates: Governorate[];
  prefill: Partial<AddressInput>;
  saved?: SavedChoice[];
  /** Cart has Click & Collect items: preselect the store pickup method. */
  preferPickup?: boolean;
  items: SummaryLine[];
  cartTotals: CartSummaryTotals;
  coupon: string;
  /** Shown above the form, e.g. the guest sign-in hint. */
  notice?: React.ReactNode;
  dict: Pick<Dictionary, "checkout" | "account" | "cart" | "errors" | "addresses">;
}) {
  const router = useRouter();
  const t = dict.checkout;

  // Merge a saved address onto the contact details, matching its area to the delivery list.
  const fromSaved = (choice: SavedChoice | undefined, base: AddressInput): AddressInput => {
    const area = choice ? resolveArea(governorates, choice.address) : null;
    return {
      ...base,
      ...emptyDelivery,
      ...choice?.address,
      // Saved names may not match the delivery list exactly; use the resolved area,
      // or keep only a valid governorate so the shopper picks the area.
      ...(area ??
        (governorates.some((g) => g.governorate === choice?.address.governorate)
          ? { areaId: "", areaName: "" }
          : { governorate: "", areaId: "", areaName: "" })),
    };
  };

  const [selected, setSelected] = useState<string>(saved[0]?.id ?? "new");
  const [address, setAddress] = useState<AddressInput>(() => {
    const base = { ...emptyAddress, ...prefill };
    return saved[0] ? fromSaved(saved[0], base) : base;
  });
  const [note, setNote] = useState("");
  const [review, setReview] = useState<ReviewData | null>(null);
  const [shipping, setShipping] = useState("");
  const [payment, setPayment] = useState<PaymentChoice | null>(null);
  const [choices, setChoices] = useState<PaymentChoice[]>([]);
  const [tomorrow, setTomorrow] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const set = (key: keyof AddressInput) => (value: string) =>
    setAddress((a) => ({ ...a, [key]: value }));

  const chooseSaved = (id: string) => {
    setSelected(id);
    const contact = { ...emptyAddress, ...prefill, email: address.email || prefill.email || "" };
    setAddress(id === "new" ? { ...contact, ...emptyDelivery } : fromSaved(saved.find((c) => c.id === id), contact));
  };
  // A saved address missing its area (unmatched) or an email opens the form so it can be completed.
  const showFields = selected === "new" || !address.areaId || !address.email;

  /** Validate the address and fetch shipping/payment options (also re-quotes after a coupon change). */
  function quote() {
    setError("");
    startTransition(async () => {
      const result = await reviewCheckoutAction({ locale, address, note });
      if (!result.ok) return setError(result.error);
      setReview(result.data);
      const methods = result.data.shipping_methods;
      const pickup = methods.find((m) => m.code.startsWith("amstorepickup"));
      setShipping(
        (current) =>
          (methods.find((m) => m.code === current) ?? (preferPickup && pickup ? pickup : methods[0]))?.code ?? "",
      );
      // Apple Pay only where the browser supports it, as on the website.
      const applePay =
        typeof window !== "undefined" &&
        "ApplePaySession" in window &&
        Boolean((window as { ApplePaySession?: { canMakePayments(): boolean } }).ApplePaySession?.canMakePayments());
      const next = paymentChoices(result.data.payment_methods, applePay);
      setChoices(next);
      setPayment((current) => next.find((c) => c.key === current?.key) ?? null);
      setTomorrow(tomorrowLabel(locale));
    });
  }

  function submitOrder() {
    setError("");
    if (!payment) return setError("choosePayment");
    startTransition(async () => {
      const result = await placeOrderAction({
        locale,
        address,
        note,
        paymentMethod: payment.method,
        gateway: payment.gateway,
        shippingMethod: shipping,
      });
      if (!result.ok) return setError(result.error);
      if (result.data.paymentUrl) {
        window.location.href = result.data.paymentUrl;
      } else {
        router.push(
          `/${locale}/checkout/success?order=${encodeURIComponent(result.data.orderId)}`,
        );
      }
    });
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (review) submitOrder();
    else quote();
  }

  // Totals: the cart's until options are loaded, then the quote plus the chosen method's cost
  // (totals are quoted before a method is chosen; Magento charges the chosen one).
  let totals: { subtotal: number; discount: number; shipping: number | null; total: number };
  if (review) {
    const quoted = Number(review.totals.shipping_amount) || 0;
    const chosen = Number(review.shipping_methods.find((m) => m.code === shipping)?.cost ?? quoted) || 0;
    totals = {
      subtotal: Number(review.totals.subtotal),
      discount: -Math.abs(Number(review.totals.discount_amount)),
      shipping: chosen,
      total: Number(review.totals.grand_total) - quoted + chosen,
    };
  } else {
    totals = { ...cartTotals, shipping: null };
  }

  const heading = "mb-3 text-sm font-semibold";

  return (
    <>
      <CheckoutStepper locale={locale} step={review ? "payment" : "address"} dict={dict} />
      <div className="grid items-start gap-6 lg:grid-cols-[1fr_24rem] xl:grid-cols-[1fr_28rem]">
        <div className="flex flex-col gap-4">
          {notice}
          <form id={FORM_ID} onSubmit={onSubmit} className="flex flex-col gap-6 rounded-lg bg-white p-5 sm:p-6">
            <FormError message={errorText(dict, error)} />
            {review ? (
              <>
                <section>
                  <h2 className={heading}>{t.shippingMethod}</h2>
                  <ShippingOptions
                    locale={locale}
                    methods={review.shipping_methods}
                    value={shipping}
                    onChange={setShipping}
                    tomorrow={tomorrow}
                    dict={dict}
                  />
                </section>
                <hr className="border-neutral-200" />
                <section>
                  <h2 className={heading}>{t.paymentMethod}</h2>
                  <PaymentOptions
                    choices={choices}
                    value={payment?.key ?? ""}
                    onChange={setPayment}
                    dict={dict}
                  />
                </section>
              </>
            ) : (
              <>
                {saved.length > 0 && (
                  <section>
                    <h2 className={heading}>{t.chooseSaved}</h2>
                    <div role="radiogroup" aria-label={t.chooseSaved} className="flex flex-col gap-3">
                      {saved.map((choice) => (
                        <label key={choice.id} className={`${optionClass} items-start`}>
                          <span className="flex flex-1 flex-col gap-0.5">
                            <span className="text-base">
                              {choice.address.firstname} {choice.address.lastname}
                            </span>
                            <span className="text-neutral-600">{choice.label}</span>
                            <span dir="ltr" className="text-start text-neutral-600">
                              {choice.address.telephone}
                            </span>
                            {selected === choice.id && showFields && (
                              <span className="text-brand-accent">{t.completeAddress}</span>
                            )}
                          </span>
                          <input
                            type="radio"
                            name="saved-address"
                            checked={selected === choice.id}
                            onChange={() => chooseSaved(choice.id)}
                            className="mt-1 size-5 shrink-0 accent-brand"
                          />
                        </label>
                      ))}
                      <button
                        type="button"
                        aria-pressed={selected === "new"}
                        onClick={() => chooseSaved("new")}
                        className="rounded-md border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-700 hover:border-neutral-400 aria-pressed:border-brand aria-pressed:bg-brand/5 aria-pressed:text-brand"
                      >
                        {t.useNewAddress}
                      </button>
                    </div>
                  </section>
                )}

                {showFields && (
                  <>
                    <section className="flex flex-col gap-4">
                      <h2 className={heading}>{t.contact}</h2>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field label={dict.account.firstname} value={address.firstname} onChange={(e) => set("firstname")(e.target.value)} autoComplete="given-name" required />
                        <Field label={dict.account.lastname} value={address.lastname} onChange={(e) => set("lastname")(e.target.value)} autoComplete="family-name" required />
                        <Field label={dict.account.email} type="email" value={address.email} onChange={(e) => set("email")(e.target.value)} autoComplete="email" required />
                        <Field label={dict.account.mobile} type="tel" inputMode="tel" value={address.telephone} onChange={(e) => set("telephone")(e.target.value)} autoComplete="tel" placeholder="5XXXXXXX" required />
                      </div>
                    </section>
                    <section className="flex flex-col gap-4">
                      <h2 className={heading}>{t.delivery}</h2>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <AreaSelect
                          governorates={governorates}
                          value={address}
                          onChange={(area) => setAddress((a) => ({ ...a, ...area }))}
                          labels={{ governorate: t.governorate, area: t.area, chooseArea: t.chooseArea }}
                        />
                        <Field label={t.block} value={address.block} onChange={(e) => set("block")(e.target.value)} required />
                        <Field label={t.street} value={address.street} onChange={(e) => set("street")(e.target.value)} required />
                        <Field label={t.avenue} value={address.avenue} onChange={(e) => set("avenue")(e.target.value)} />
                        <Field label={t.house} value={address.house} onChange={(e) => set("house")(e.target.value)} required />
                        <Field label={t.floor} value={address.floor} onChange={(e) => set("floor")(e.target.value)} />
                        <Field label={t.apartment} value={address.apartment} onChange={(e) => set("apartment")(e.target.value)} />
                      </div>
                    </section>
                  </>
                )}

                <label className="flex flex-col gap-1 border-t border-neutral-200 pt-5 text-sm">
                  <span className="font-medium">{t.note}</span>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={2}
                    className="rounded border border-neutral-300 px-3 py-2 text-base"
                  />
                </label>
              </>
            )}
          </form>
        </div>

        <aside className="flex flex-col gap-5 rounded-lg bg-white p-5 sm:p-6 lg:sticky lg:top-4">
          <h2 className="text-2xl font-bold">{t.summary}</h2>
          <ul className="flex flex-col gap-4 border-b border-neutral-200 pb-5">
            {items.map((item) => (
              <li key={item.id} className="flex items-center gap-3 text-xs">
                <span className="relative shrink-0">
                  <ProductImage src={item.image} alt="" sizes="48px" className="size-12 rounded" />
                  <span className="absolute -end-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-brand text-[11px] font-semibold text-white">
                    {item.qty}
                  </span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium uppercase">{item.name}</span>
                  <span className="text-neutral-500">{formatPrice(item.price, locale)}</span>
                </span>
              </li>
            ))}
          </ul>

          <div className="border-b border-neutral-200 pb-5">
            <CouponForm
              locale={locale}
              coupon={coupon}
              // Coupons change the quote, so re-quote on the payment step.
              onChange={() => review && quote()}
              dict={dict}
            />
          </div>

          {review?.promotion_message && (
            <p className="text-sm text-green-700">{review.promotion_message}</p>
          )}
          <dl className="grid grid-cols-[1fr_auto] gap-y-3 border-b border-neutral-200 pb-5 text-sm">
            <dt className="text-neutral-600">{dict.cart.subtotal}</dt>
            <dd>{formatPrice(totals.subtotal, locale)}</dd>
            {totals.discount !== 0 && (
              <>
                <dt className="text-green-700">{dict.cart.discount}</dt>
                <dd className="text-green-700">−{formatPrice(Math.abs(totals.discount), locale)}</dd>
              </>
            )}
            {totals.shipping !== null && (
              <>
                <dt className="text-neutral-600">{dict.cart.shipping}</dt>
                <dd>{totals.shipping > 0 ? formatPrice(totals.shipping, locale) : dict.cart.free}</dd>
              </>
            )}
            <dt className="mt-2 border-t border-neutral-200 pt-4 text-base font-bold">{dict.cart.total}</dt>
            <dd className="mt-2 border-t border-neutral-200 pt-4 text-base font-bold">
              {formatPrice(totals.total, locale)}
            </dd>
          </dl>

          <div className="flex gap-3">
            {review ? (
              <button
                type="button"
                onClick={() => {
                  setError("");
                  setReview(null);
                }}
                className="rounded bg-neutral-100 px-5 py-3 text-sm font-medium hover:bg-neutral-200"
              >
                {t.back}
              </button>
            ) : (
              <Link
                href={`/${locale}/cart`}
                className="rounded bg-neutral-100 px-5 py-3 text-sm font-medium hover:bg-neutral-200"
              >
                {t.back}
              </Link>
            )}
            <button
              type="submit"
              form={FORM_ID}
              disabled={pending || (review !== null && !payment)}
              className="flex-1 rounded bg-brand px-4 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
            >
              {review
                ? pending
                  ? t.placing
                  : payment
                    ? t.placeOrder
                    : t.choosePaymentFirst
                : pending
                  ? t.checking
                  : t.continue}
            </button>
          </div>
        </aside>
      </div>
    </>
  );
}
