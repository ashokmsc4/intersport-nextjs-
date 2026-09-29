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
import { formatPrice } from "@/lib/format";
import { CartTotals } from "@/components/cart/CartTotals";
import { Field, FormError, buttonClass } from "@/components/forms/Field";

type Governorate = {
  governorate: string;
  areas: { area: string; area_name: string }[];
};

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

/** Gateways arrive as [{ knet: "KNET", CC: "VISA / MASTER CARD" }]. */
const gatewaysOf = (method: ReviewData["payment_methods"][number]) =>
  method.gateways.flatMap((g) => Object.entries(g));

export function CheckoutForm({
  locale,
  governorates,
  prefill,
  dict,
}: {
  locale: Locale;
  governorates: Governorate[];
  prefill: Partial<AddressInput>;
  dict: Pick<Dictionary, "checkout" | "account" | "cart" | "errors">;
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
  const [payment, setPayment] = useState("");
  const [gateway, setGateway] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const set = (key: keyof AddressInput) => (value: string) =>
    setAddress((a) => ({ ...a, [key]: value }));
  const areas =
    governorates.find((g) => g.governorate === address.governorate)?.areas ?? [];

  function submitAddress(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      const result = await reviewCheckoutAction({ locale, address, note });
      if (!result.ok) return setError(result.error);
      setReview(result.data);
      setShipping(result.data.shipping_methods[0]?.code ?? "");
      const first = result.data.payment_methods[0];
      setPayment(first?.code ?? "");
      setGateway(first ? (gatewaysOf(first)[0]?.[0] ?? "") : "");
    });
  }

  function submitOrder(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      const result = await placeOrderAction({
        locale,
        address,
        note,
        paymentMethod: payment,
        gateway,
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

  if (review) {
    const totals = review.totals;
    return (
      <form onSubmit={submitOrder} className="flex flex-col gap-6">
        <FormError message={errorText(dict, error)} />
        <section className="rounded-lg border border-neutral-200 p-4 text-sm">
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
          <button
            type="button"
            onClick={() => setReview(null)}
            className="mt-2 text-brand underline"
          >
            {t.editAddress}
          </button>
        </section>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 font-semibold">{t.shippingMethod}</legend>
          {review.shipping_methods.map((method) => (
            <label key={method.code} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="shipping"
                value={method.code}
                checked={shipping === method.code}
                onChange={() => setShipping(method.code)}
              />
              <span className="flex-1">{method.title}</span>
              <span>
                {Number(method.cost) > 0
                  ? formatPrice(Number(method.cost), locale)
                  : dict.cart.free}
              </span>
            </label>
          ))}
        </fieldset>

        <fieldset className="flex flex-col gap-3">
          <legend className="mb-2 font-semibold">{t.payment}</legend>
          {review.payment_methods.map((method) => {
            const gateways = gatewaysOf(method);
            return (
              <div key={method.code} className="rounded border border-neutral-200 p-3">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="radio"
                    name="payment"
                    value={method.code}
                    checked={payment === method.code}
                    onChange={() => {
                      setPayment(method.code);
                      setGateway(gateways[0]?.[0] ?? "");
                    }}
                  />
                  {method.title}
                </label>
                {payment === method.code && gateways.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-3 ps-6 text-sm">
                    {gateways.map(([code, label]) => (
                      <label key={code} className="flex items-center gap-1">
                        <input
                          type="radio"
                          name="gateway"
                          value={code}
                          checked={gateway === code}
                          onChange={() => setGateway(code)}
                        />
                        {label.trim()}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </fieldset>

        {review.promotion_message && (
          <p className="text-sm text-green-700">{review.promotion_message}</p>
        )}
        <CartTotals
          locale={locale}
          dict={dict}
          subtotal={Number(totals.subtotal)}
          discount={-Math.abs(Number(totals.discount_amount))}
          shipping={Number(totals.shipping_amount)}
          total={Number(totals.grand_total)}
        />
        <button type="submit" disabled={pending || !payment} className={buttonClass}>
          {pending ? t.placing : t.placeOrder}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={submitAddress} className="flex flex-col gap-6">
      <FormError message={errorText(dict, error)} />
      <section className="flex flex-col gap-4">
        <h2 className="font-semibold">{t.contact}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={dict.account.firstname} value={address.firstname} onChange={(e) => set("firstname")(e.target.value)} autoComplete="given-name" required />
          <Field label={dict.account.lastname} value={address.lastname} onChange={(e) => set("lastname")(e.target.value)} autoComplete="family-name" required />
          <Field label={dict.account.email} type="email" value={address.email} onChange={(e) => set("email")(e.target.value)} autoComplete="email" required />
          <Field label={dict.account.mobile} type="tel" inputMode="tel" value={address.telephone} onChange={(e) => set("telephone")(e.target.value)} autoComplete="tel" placeholder="5XXXXXXX" required />
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-semibold">{t.delivery}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">{t.governorate}</span>
            <select
              value={address.governorate}
              onChange={(e) =>
                setAddress((a) => ({
                  ...a,
                  governorate: e.target.value,
                  areaId: "",
                  areaName: "",
                }))
              }
              required
              className="rounded border border-neutral-300 px-3 py-2 text-base"
            >
              <option value="" disabled />
              {governorates.map((g) => (
                <option key={g.governorate} value={g.governorate}>
                  {g.governorate}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">{t.area}</span>
            <select
              value={address.areaId}
              onChange={(e) => {
                const area = areas.find((a) => a.area === e.target.value);
                setAddress((a) => ({
                  ...a,
                  areaId: area?.area ?? "",
                  areaName: area?.area_name ?? "",
                }));
              }}
              disabled={!address.governorate}
              required
              className="rounded border border-neutral-300 px-3 py-2 text-base"
            >
              <option value="">{t.chooseArea}</option>
              {areas.map((a) => (
                <option key={a.area} value={a.area}>
                  {a.area_name}
                </option>
              ))}
            </select>
          </label>
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
