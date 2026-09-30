"use client";

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
import { CartTotals } from "@/components/cart/CartTotals";
import { Field, FormError, buttonClass } from "@/components/forms/Field";
import { AreaSelect, type Governorate } from "@/components/account/AreaSelect";
import { resolveArea } from "@/lib/areas";
import {
  PaymentOptions,
  ShippingOptions,
  StepHeading,
  paymentChoices,
  type PaymentChoice,
} from "./CheckoutSteps";

/** A saved address already mapped to checkout fields, with a display label. */
export type SavedChoice = { id: string; label: string; address: Partial<AddressInput> };

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

export function CheckoutForm({
  locale,
  governorates,
  prefill,
  saved = [],
  preferPickup = false,
  dict,
}: {
  locale: Locale;
  governorates: Governorate[];
  prefill: Partial<AddressInput>;
  saved?: SavedChoice[];
  /** Cart has Click & Collect items: preselect the store pickup method. */
  preferPickup?: boolean;
  dict: Pick<Dictionary, "checkout" | "account" | "cart" | "errors" | "addresses">;
}) {
  const router = useRouter();
  const t = dict.checkout;
  const [address, setAddress] = useState<AddressInput>({
    ...emptyAddress,
    ...prefill,
  });
  const [note, setNote] = useState("");
  const [review, setReview] = useState<ReviewData | null>(null);
  const [shipping, setShipping] = useState("");
  const [payment, setPayment] = useState<PaymentChoice | null>(null);
  const [choices, setChoices] = useState<PaymentChoice[]>([]);
  const [tomorrow, setTomorrow] = useState("");
  const [billingSame, setBillingSame] = useState(true);
  const [billing, setBilling] = useState<AddressInput>(emptyAddress);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const set = (key: keyof AddressInput) => (value: string) =>
    setAddress((a) => ({ ...a, [key]: value }));

  function submitAddress(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      const result = await reviewCheckoutAction({ locale, address, note });
      if (!result.ok) return setError(result.error);
      setReview(result.data);
      const methods = result.data.shipping_methods;
      const pickup = methods.find((m) => m.code.startsWith("amstorepickup"));
      setShipping((preferPickup && pickup ? pickup : methods[0])?.code ?? "");
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

  function submitOrder(e: React.FormEvent) {
    e.preventDefault();
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
        billing: billingSame ? undefined : billing,
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

  if (review) {
    const totals = review.totals;
    // Totals are quoted before a method is chosen; show the chosen method's cost
    // (Magento charges that method when the order is placed).
    const quotedShipping = Number(totals.shipping_amount) || 0;
    const chosenCost = Number(review.shipping_methods.find((m) => m.code === shipping)?.cost ?? quotedShipping) || 0;
    return (
      <form onSubmit={submitOrder} className="flex flex-col gap-10">
        <FormError message={errorText(dict, error)} />
        <section className="flex flex-wrap items-start justify-between gap-2 rounded-md border border-neutral-300 p-4 text-sm">
          <div>
            <p className="mb-1 text-xs font-bold tracking-wider text-neutral-500 uppercase">{t.shipTo}</p>
            <p className="font-semibold">
              {address.firstname} {address.lastname}
            </p>
            <p>
              {[
                `${t.block} ${address.block}`,
                address.street,
                address.avenue,
                `${t.house} ${address.house}`,
                address.areaName,
                address.governorate,
              ]
                .filter(Boolean)
                .join(", ")}
            </p>
            <p dir="ltr" className="text-start">
              {address.telephone} · {address.email}
            </p>
          </div>
          <button type="button" onClick={() => setReview(null)} className="text-brand underline">
            {t.editAddress}
          </button>
        </section>

        <section>
          <StepHeading step={3}>{t.shippingMethod}</StepHeading>
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
          <StepHeading step={4}>{t.billing}</StepHeading>
          <label className="flex cursor-pointer items-center gap-4 bg-blue-50 px-5 py-5 text-sm tracking-wide text-brand">
            <input
              type="checkbox"
              checked={billingSame}
              onChange={(e) => {
                setBillingSame(e.target.checked);
                if (!e.target.checked && !billing.firstname) {
                  setBilling({ ...emptyAddress, firstname: address.firstname, lastname: address.lastname, telephone: address.telephone });
                }
              }}
              className="size-6 accent-sky-500"
            />
            {t.billingSame}
          </label>
          {!billingSame && (
            <div className="mt-4 grid gap-4 sm:ms-12 sm:grid-cols-2">
              <Field label={dict.account.firstname} value={billing.firstname} onChange={(e) => setBilling((b) => ({ ...b, firstname: e.target.value }))} autoComplete="billing given-name" required />
              <Field label={dict.account.lastname} value={billing.lastname} onChange={(e) => setBilling((b) => ({ ...b, lastname: e.target.value }))} autoComplete="billing family-name" required />
              <Field label={dict.account.mobile} type="tel" inputMode="tel" value={billing.telephone} onChange={(e) => setBilling((b) => ({ ...b, telephone: e.target.value }))} autoComplete="billing tel" required />
              <div className="hidden sm:block" />
              <AreaSelect
                governorates={governorates}
                value={billing}
                onChange={(area) => setBilling((b) => ({ ...b, ...area }))}
                labels={{ governorate: t.governorate, area: t.area, chooseArea: t.chooseArea }}
              />
              <Field label={t.block} value={billing.block} onChange={(e) => setBilling((b) => ({ ...b, block: e.target.value }))} required />
              <Field label={t.street} value={billing.street} onChange={(e) => setBilling((b) => ({ ...b, street: e.target.value }))} required />
              <Field label={t.house} value={billing.house} onChange={(e) => setBilling((b) => ({ ...b, house: e.target.value }))} required />
            </div>
          )}
        </section>

        <section>
          <StepHeading step={5}>{t.payment}</StepHeading>
          <PaymentOptions
            choices={choices}
            value={payment?.key ?? ""}
            onChange={setPayment}
            dict={dict}
          />
        </section>

        {review.promotion_message && (
          <p className="text-sm text-green-700">{review.promotion_message}</p>
        )}
        <CartTotals
          locale={locale}
          dict={dict}
          subtotal={Number(totals.subtotal)}
          discount={-Math.abs(Number(totals.discount_amount))}
          shipping={chosenCost}
          total={Number(totals.grand_total) - quotedShipping + chosenCost}
        />
        <button type="submit" disabled={pending || !payment} className={buttonClass}>
          {pending ? t.placing : payment ? t.placeOrder : t.choosePaymentFirst}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={submitAddress} className="flex flex-col gap-6">
      <FormError message={errorText(dict, error)} />
      <section className="flex flex-col gap-4">
        <StepHeading step={1}>{t.contact}</StepHeading>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={dict.account.firstname} value={address.firstname} onChange={(e) => set("firstname")(e.target.value)} autoComplete="given-name" required />
          <Field label={dict.account.lastname} value={address.lastname} onChange={(e) => set("lastname")(e.target.value)} autoComplete="family-name" required />
          <Field label={dict.account.email} type="email" value={address.email} onChange={(e) => set("email")(e.target.value)} autoComplete="email" required />
          <Field label={dict.account.mobile} type="tel" inputMode="tel" value={address.telephone} onChange={(e) => set("telephone")(e.target.value)} autoComplete="tel" placeholder="5XXXXXXX" required />
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <StepHeading step={2}>{t.delivery}</StepHeading>
        {saved.length > 0 && (
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">{dict.addresses.useSaved}</span>
            <select
              defaultValue=""
              onChange={(e) => {
                const choice = saved.find((c) => c.id === e.target.value);
                const area = choice ? resolveArea(governorates, choice.address) : null;
                setAddress((a) => ({
                  ...a,
                  ...emptyDelivery,
                  ...choice?.address,
                  // Saved names may not match the delivery list exactly; use the resolved area,
                  // or keep only a valid governorate so the shopper picks the area.
                  ...(area ??
                    (governorates.some((g) => g.governorate === choice?.address.governorate)
                      ? { areaId: "", areaName: "" }
                      : { governorate: "", areaId: "", areaName: "" })),
                }));
              }}
              className="rounded border border-neutral-300 px-3 py-2 text-base"
            >
              <option value="">{dict.addresses.newAddress}</option>
              {saved.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
        )}
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
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">{t.note}</span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            className="rounded border border-neutral-300 px-3 py-2 text-base"
          />
        </label>
      </section>

      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? t.checking : t.continue}
      </button>
    </form>
  );
}
