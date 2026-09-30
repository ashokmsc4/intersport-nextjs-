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
import { ArrowIcon, CardIcon, LockIcon, PinIcon, PlusIcon, TruckIcon, UserIcon } from "@/components/icons";
import {
  CheckoutStepper,
  PaymentOptions,
  ShippingOptions,
  optionClass,
  paymentChoices,
  type PaymentChoice,
} from "./CheckoutSteps";

/** A saved address already mapped to checkout fields, with a display label. */
export type SavedChoice = {
  id: string;
  label: string;
  address: Partial<AddressInput>;
  /** The customer's default shipping address. */
  isDefault?: boolean;
};

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

  const primaryLabel = review
    ? pending
      ? t.placing
      : payment
        ? t.placeOrder
        : t.choosePaymentFirst
    : pending
      ? t.checking
      : t.continue;
  const primaryDisabled = pending || (review !== null && !payment);
  const primaryClass =
    "flex flex-1 items-center justify-center gap-2 rounded-md bg-brand px-4 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-60 [&_svg]:rtl:rotate-180";
  const backClass =
    "rounded-md border border-neutral-200 bg-white px-5 py-3.5 text-sm font-medium text-neutral-700 transition hover:border-neutral-400";
  const back = review ? (
    <button
      type="button"
      onClick={() => {
        setError("");
        setReview(null);
      }}
      className={backClass}
    >
      {t.back}
    </button>
  ) : (
    <Link href={`/${locale}/cart`} className={backClass}>
      {t.back}
    </Link>
  );
  const itemCount = items.reduce((n, i) => n + i.qty, 0);

  return (
    <>
      <CheckoutStepper locale={locale} step={review ? "payment" : "address"} dict={dict} />
      <div className="grid items-start gap-6 pb-24 lg:grid-cols-[1fr_24rem] lg:pb-0 xl:grid-cols-[1fr_26rem]">
        <div className="flex flex-col gap-4">
          {notice}
          <form id={FORM_ID} onSubmit={onSubmit} className={`${card} flex flex-col gap-8`}>
            <FormError message={errorText(dict, error)} />
            {review ? (
              <>
                <section>
                  <SectionTitle icon={<TruckIcon />} title={t.shippingMethod} />
                  <ShippingOptions
                    locale={locale}
                    methods={review.shipping_methods}
                    value={shipping}
                    onChange={setShipping}
                    tomorrow={tomorrow}
                    dict={dict}
                  />
                </section>
                <section>
                  <SectionTitle icon={<CardIcon />} title={t.paymentMethod} />
                  <PaymentOptions
                    choices={choices}
                    value={payment?.key ?? ""}
                    onChange={setPayment}
                    dict={dict}
                  />
                </section>
                <DeliverTo address={address} onEdit={() => setReview(null)} dict={dict} />
              </>
            ) : (
              <>
                {saved.length > 0 && (
                  <section>
                    <SectionTitle icon={<PinIcon />} title={t.chooseSaved} />
                    <div role="radiogroup" aria-label={t.chooseSaved} className="flex flex-col gap-3">
                      {saved.map((choice) => (
                        <label key={choice.id} className={`${optionClass} items-start py-4`}>
                          <input
                            type="radio"
                            name="saved-address"
                            checked={selected === choice.id}
                            onChange={() => chooseSaved(choice.id)}
                            className="mt-0.5 size-4 shrink-0 accent-brand"
                          />
                          <span className="flex flex-1 flex-col gap-0.5">
                            <span className="flex flex-wrap items-center gap-2 font-semibold">
                              {choice.address.firstname} {choice.address.lastname}
                              {choice.isDefault && (
                                <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-medium text-brand">
                                  {dict.addresses.default}
                                </span>
                              )}
                            </span>
                            <span className="text-neutral-600">{choice.label}</span>
                            <span dir="ltr" className="text-start text-neutral-500">
                              {choice.address.telephone}
                            </span>
                            {selected === choice.id && showFields && (
                              <span className="mt-1 text-brand-accent">{t.completeAddress}</span>
                            )}
                          </span>
                        </label>
                      ))}
                      <button
                        type="button"
                        aria-pressed={selected === "new"}
                        onClick={() => chooseSaved("new")}
                        className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-neutral-300 px-4 py-3.5 text-sm font-medium text-neutral-700 transition hover:border-brand hover:text-brand aria-pressed:border-solid aria-pressed:border-brand aria-pressed:bg-brand/5 aria-pressed:text-brand"
                      >
                        <PlusIcon />
                        {t.useNewAddress}
                      </button>
                    </div>
                  </section>
                )}

                {showFields && (
                  <>
                    <section>
                      <SectionTitle icon={<UserIcon />} title={t.contact} />
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field label={dict.account.firstname} value={address.firstname} onChange={(e) => set("firstname")(e.target.value)} autoComplete="given-name" required />
                        <Field label={dict.account.lastname} value={address.lastname} onChange={(e) => set("lastname")(e.target.value)} autoComplete="family-name" required />
                        <Field label={dict.account.email} type="email" value={address.email} onChange={(e) => set("email")(e.target.value)} autoComplete="email" required />
                        <Field label={dict.account.mobile} type="tel" inputMode="tel" value={address.telephone} onChange={(e) => set("telephone")(e.target.value)} autoComplete="tel" placeholder="5XXXXXXX" required />
                      </div>
                    </section>
                    <section>
                      <SectionTitle icon={<PinIcon />} title={t.delivery} />
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

                <label className="flex flex-col gap-1.5 text-sm">
                  <span className="font-medium">{t.note}</span>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={2}
                    className="rounded-md border border-neutral-300 px-3 py-2 text-base focus:border-brand focus:ring-2 focus:ring-brand/20 focus:outline-none"
                  />
                </label>
              </>
            )}
          </form>
        </div>

        <aside className={`${card} flex flex-col gap-5 lg:sticky lg:top-4`}>
          <h2 className="flex items-baseline justify-between gap-2">
            <span className="text-xl font-bold">{t.summary}</span>
            <span className="text-sm text-neutral-500">{itemCount === 1 ? t.itemOne : t.itemCount.replace("{count}", String(itemCount))}</span>
          </h2>
          <ul className="-mx-1 flex max-h-72 flex-col gap-4 overflow-y-auto px-1 pt-2">
            {items.map((item) => (
              <li key={item.id} className="flex items-center gap-3 text-sm">
                <span className="relative shrink-0">
                  <ProductImage src={item.image} alt="" sizes="64px" className="size-16 rounded-md border border-neutral-100" />
                  <span className="absolute -end-2 -top-2 flex size-5 items-center justify-center rounded-full bg-brand text-[11px] font-semibold text-white ring-2 ring-white">
                    {item.qty}
                  </span>
                </span>
                <span className="line-clamp-2 min-w-0 flex-1 text-xs font-medium uppercase leading-snug">{item.name}</span>
                <span className="shrink-0 font-semibold">{formatPrice(item.price, locale)}</span>
              </li>
            ))}
          </ul>

          <div className="border-t border-neutral-100 pt-5">
            <CouponForm
              locale={locale}
              coupon={coupon}
              // Coupons change the quote, so re-quote on the payment step.
              onChange={() => review && quote()}
              dict={dict}
            />
          </div>

          {review?.promotion_message && (
            <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">{review.promotion_message}</p>
          )}
          <dl className="grid grid-cols-[1fr_auto] gap-y-2.5 border-t border-neutral-100 pt-5 text-sm">
            <dt className="text-neutral-600">{dict.cart.subtotal}</dt>
            <dd>{formatPrice(totals.subtotal, locale)}</dd>
            {totals.discount !== 0 && (
              <>
                <dt className="text-green-700">{dict.cart.discount}</dt>
                <dd className="text-green-700">−{formatPrice(Math.abs(totals.discount), locale)}</dd>
              </>
            )}
            <dt className="text-neutral-600">{dict.cart.shipping}</dt>
            <dd className={totals.shipping === null ? "text-neutral-400" : ""}>
              {totals.shipping === null
                ? t.shippingNext
                : totals.shipping > 0
                  ? formatPrice(totals.shipping, locale)
                  : dict.cart.free}
            </dd>
            <dt className="mt-3 border-t border-neutral-200 pt-4 text-base font-bold">{dict.cart.total}</dt>
            <dd className="mt-3 border-t border-neutral-200 pt-4 text-lg font-bold">
              {formatPrice(totals.total, locale)}
            </dd>
            {totals.discount !== 0 && (
              <dd className="col-span-2 text-end text-xs font-medium text-green-700">
                {t.youSave.replace("{amount}", formatPrice(Math.abs(totals.discount), locale))}
              </dd>
            )}
          </dl>

          <div className="hidden gap-3 lg:flex">
            {back}
            <button type="submit" form={FORM_ID} disabled={primaryDisabled} className={primaryClass}>
              {primaryLabel}
              {!pending && <ArrowIcon />}
            </button>
          </div>
          <p className="flex items-center justify-center gap-1.5 text-xs text-neutral-500">
            <LockIcon />
            {t.secure}
          </p>
        </aside>
      </div>

      {/* Phones: keep the total and the step's button in reach below the long form. */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-neutral-200 bg-white/95 px-4 py-3 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <p className="flex flex-col text-xs text-neutral-500">
            {dict.cart.total}
            <span className="text-base font-bold text-neutral-900">{formatPrice(totals.total, locale)}</span>
          </p>
          <button type="submit" form={FORM_ID} disabled={primaryDisabled} className={primaryClass}>
            {primaryLabel}
            {!pending && <ArrowIcon />}
          </button>
        </div>
      </div>
    </>
  );
}

const card = "rounded-xl border border-neutral-200/70 bg-white p-5 shadow-sm sm:p-7";

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <h2 className="mb-4 flex items-center gap-2.5 text-base font-semibold">
      <span className="flex size-8 items-center justify-center rounded-full bg-brand/10 text-brand [&_svg]:size-4">
        {icon}
      </span>
      {title}
    </h2>
  );
}

/** The address the order ships to, on the payment step. */
function DeliverTo({
  address,
  onEdit,
  dict,
}: {
  address: AddressInput;
  onEdit: () => void;
  dict: Pick<Dictionary, "checkout">;
}) {
  const t = dict.checkout;
  return (
    <section className="flex items-start gap-3 rounded-lg bg-neutral-50 p-4 text-sm">
      <span className="mt-0.5 text-neutral-500 [&_svg]:size-4">
        <PinIcon />
      </span>
      <div className="flex-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{t.shipTo}</p>
        <p className="font-medium">
          {address.firstname} {address.lastname}
        </p>
        <p className="text-neutral-600">
          {[`${t.block} ${address.block}`, address.street, address.avenue, `${t.house} ${address.house}`, address.areaName]
            .filter(Boolean)
            .join(", ")}
        </p>
      </div>
      <button type="button" onClick={onEdit} className="text-sm font-medium text-brand hover:underline">
        {t.editAddress}
      </button>
    </section>
  );
}
