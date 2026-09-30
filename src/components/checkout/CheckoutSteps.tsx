"use client";

import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import type { PaymentMethod, ShippingMethod } from "@/lib/magento/checkout";
import { formatPrice } from "@/lib/format";
import { BoxIcon, CardIcon, CartIcon, CheckIcon, PinIcon, RocketIcon, StoreIcon, TruckIcon } from "@/components/icons";

export type CheckoutStep = "address" | "payment";

/** Cart → Address → Payment progress; Cart is always done and links back to the cart. */
export function CheckoutStepper({
  locale,
  step,
  dict,
}: {
  locale: string;
  step: CheckoutStep;
  dict: Pick<Dictionary, "checkout">;
}) {
  const t = dict.checkout;
  const steps = [
    { key: "cart", label: t.stepCart, Icon: CartIcon },
    { key: "address", label: t.stepAddress, Icon: PinIcon },
    { key: "payment", label: t.stepPayment, Icon: CardIcon },
  ] as const;
  const current = steps.findIndex((s) => s.key === step);
  return (
    <nav aria-label={t.progress} className="mb-8">
      <ol className="flex items-start justify-center">
        {steps.map(({ key, label, Icon }, i) => {
          const done = i < current;
          const active = i === current;
          const circle = (
            <span
              className={`flex size-10 items-center justify-center rounded-full transition [&_svg]:size-[18px] ${
                active
                  ? "bg-brand text-white shadow-md ring-4 ring-brand/15"
                  : done
                    ? "bg-brand text-white"
                    : "border border-neutral-300 bg-white text-neutral-400"
              }`}
            >
              {done ? <CheckIcon /> : <Icon />}
            </span>
          );
          return (
            <li key={key} className="flex items-start">
              {i > 0 && (
                <span
                  aria-hidden
                  className={`mx-2 mt-5 h-0.5 w-12 sm:mx-3 sm:w-20 ${i <= current ? "bg-brand" : "bg-neutral-300"}`}
                />
              )}
              <div
                aria-current={active ? "step" : undefined}
                className={`flex w-16 flex-col items-center gap-1.5 text-sm ${
                  done || active ? "font-medium text-neutral-900" : "text-neutral-500"
                }`}
              >
                {key === "cart" ? (
                  <a href={`/${locale}/cart`} className="rounded-full hover:opacity-80">
                    {circle}
                  </a>
                ) : (
                  circle
                )}
                {label}
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** Selectable card row shared by the shipping, payment and saved-address choices. */
export const optionClass =
  "flex cursor-pointer items-center gap-3 rounded-lg border border-neutral-200 bg-white px-4 py-3.5 text-sm transition hover:border-neutral-400 has-[:checked]:border-brand has-[:checked]:bg-brand/[0.04] has-[:checked]:ring-1 has-[:checked]:ring-brand has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand/40";

const radioClass = "size-4 shrink-0 accent-brand";

const SHIPPING_ICONS = { express: RocketIcon, pickup: StoreIcon, nextDay: BoxIcon, other: TruckIcon };

function shippingKind(code: string) {
  if (code.startsWith("same_day")) return "express" as const;
  if (code.startsWith("amstorepickup")) return "pickup" as const;
  if (code.startsWith("flatrate")) return "nextDay" as const;
  return "other" as const;
}

export function ShippingOptions({
  locale,
  methods,
  value,
  onChange,
  tomorrow,
  dict,
}: {
  locale: Locale;
  methods: ShippingMethod[];
  value: string;
  onChange: (code: string) => void;
  /** Tomorrow's date, formatted when the options were loaded. */
  tomorrow: string;
  dict: Pick<Dictionary, "checkout">;
}) {
  const t = dict.checkout;
  return (
    <div role="radiogroup" aria-label={t.shippingMethod} className="flex flex-col gap-3">
      {methods.map((method) => {
        const kind = shippingKind(method.code);
        const Icon = SHIPPING_ICONS[kind];
        const cost = Number(method.cost);
        const [before, after] = t.getItIn.split("{time}");
        return (
          <label key={method.code} className={optionClass}>
            <input
              type="radio"
              name="shipping"
              value={method.code}
              checked={value === method.code}
              onChange={() => onChange(method.code)}
              className={radioClass}
            />
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-700 [&_svg]:size-5">
              <Icon />
            </span>
            <span className="flex flex-1 flex-col">
              <span className="font-medium">{method.title}</span>
              {kind !== "other" && (
                <span className="text-xs text-neutral-500">
                  {kind === "nextDay" && t.getItBy.replace("{date}", tomorrow)}
                  {kind === "express" && (
                    <>
                      {before}
                      <span className="text-green-700">{t.twoHours}</span>
                      {after}
                    </>
                  )}
                  {kind === "pickup" && t.collectFromStore}
                </span>
              )}
            </span>
            <span className={`shrink-0 font-semibold ${cost > 0 ? "" : "text-green-700"}`}>
              {cost > 0 ? formatPrice(cost, locale) : t.freeShipping}
            </span>
          </label>
        );
      })}
    </div>
  );
}

/** One choice per payment option; the Tap gateways (KNET, cards, Deema, Apple Pay) are listed on their own. */
export type PaymentChoice = { key: string; method: string; gateway: string; label: string };

const LOGOS: Record<string, { src: string; width: number; dark?: boolean }> = {
  knet: { src: "/payments/knet.png", width: 44 },
  applepay: { src: "/payments/applepay.png", width: 44 },
  deema: { src: "/payments/deema.png", width: 36 },
  taly: { src: "/payments/taly.png", width: 80, dark: true },
  tabby_installments: { src: "/payments/tabby.png", width: 72 },
};

// The website's order; anything new from the API goes at the end.
const ORDER = ["applepay", "knet", "taly", "CC", "deema", "tabby_installments", "cashondelivery"];

export function paymentChoices(methods: PaymentMethod[], applePay: boolean): PaymentChoice[] {
  const choices = methods.flatMap((m) => {
    const gateways = m.gateways.flatMap((g) => Object.entries(g));
    return gateways.length
      ? gateways.map(([gateway, label]) => ({ key: `${m.code}:${gateway}`, method: m.code, gateway, label: label.trim() }))
      : [{ key: m.code, method: m.code, gateway: "", label: m.title.trim() }];
  });
  const rank = (c: PaymentChoice) => {
    const i = ORDER.indexOf(c.gateway || c.method);
    return i < 0 ? ORDER.length : i;
  };
  return choices
    .filter((c) => c.gateway !== "applepay" || applePay)
    .sort((a, b) => rank(a) - rank(b));
}

const CodBadge = () => (
  <span aria-hidden className="rounded-sm border-2 border-neutral-700 px-1.5 text-xs font-black tracking-tight text-neutral-800">
    COD
  </span>
);

export function PaymentOptions({
  choices,
  value,
  onChange,
  dict,
}: {
  choices: PaymentChoice[];
  value: string;
  onChange: (choice: PaymentChoice) => void;
  dict: Pick<Dictionary, "checkout">;
}) {
  const t = dict.checkout;
  return (
    <div role="radiogroup" aria-label={t.paymentMethod} className="flex flex-col gap-3">
      {choices.map((choice) => {
        const code = choice.gateway || choice.method;
        const logo = LOGOS[code];
        return (
          <div key={choice.key}>
            <label className={optionClass}>
              <input
                type="radio"
                name="payment"
                value={choice.key}
                checked={value === choice.key}
                onChange={() => onChange(choice)}
                className={radioClass}
              />
              {/* Fixed-width logo slot so the labels line up. */}
              <span className="flex h-7 w-20 shrink-0 items-center [&_svg]:size-5 [&_svg]:text-neutral-500">
                {logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logo.src}
                    alt=""
                    width={logo.width}
                    className={`h-auto max-h-7 ${logo.dark ? "" : "rounded border border-neutral-200 bg-white p-0.5"}`}
                  />
                ) : code === "cashondelivery" ? (
                  <CodBadge />
                ) : (
                  <CardIcon />
                )}
              </span>
              <span className="font-medium">{choice.label}</span>
            </label>
            {code === "cashondelivery" && value === choice.key && (
              <p className="mt-2 px-4 text-xs text-neutral-600">{t.codNote}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
