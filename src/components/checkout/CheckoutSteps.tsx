"use client";

import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import type { PaymentMethod, ShippingMethod } from "@/lib/magento/checkout";
import { formatPrice } from "@/lib/format";
import { BoxIcon, RocketIcon, StoreIcon, TruckIcon } from "@/components/icons";

/** Section title with its step number in a circle, as on the website's checkout. */
export function StepHeading({ step, children }: { step: number; children: React.ReactNode }) {
  return (
    <h2 className="mb-5 flex items-center gap-4 text-xl font-bold tracking-wide sm:text-2xl">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand text-lg text-white">
        {step}
      </span>
      {children}
    </h2>
  );
}

const radioClass = "size-5 shrink-0 accent-sky-500";
const pillClass = "shrink-0 bg-neutral-100 px-4 py-2 text-brand tracking-wide";

function shippingLook(code: string) {
  if (code.startsWith("same_day")) return { Icon: RocketIcon, kind: "express" as const };
  if (code.startsWith("amstorepickup")) return { Icon: StoreIcon, kind: "pickup" as const };
  if (code.startsWith("flatrate")) return { Icon: BoxIcon, kind: "nextDay" as const };
  return { Icon: TruckIcon, kind: "other" as const };
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
  dict: Pick<Dictionary, "checkout" | "cart">;
}) {
  const t = dict.checkout;
  return (
    <div role="radiogroup" aria-label={t.shippingMethod} className="divide-y divide-neutral-300 rounded-md border border-neutral-300 px-4 sm:ms-12 sm:px-6">
      {methods.map((method) => {
        const { Icon, kind } = shippingLook(method.code);
        const cost = Number(method.cost);
        const [before, after] = t.getItIn.split("{time}");
        return (
          <label key={method.code} className="flex cursor-pointer items-center gap-4 py-5 sm:gap-6">
            <input
              type="radio"
              name="shipping"
              value={method.code}
              checked={value === method.code}
              onChange={() => onChange(method.code)}
              className={radioClass}
            />
            <Icon />
            <span className="flex flex-1 flex-col gap-1">
              <span className="text-lg tracking-wide">{method.title}</span>
              <span className="text-sm tracking-wide text-neutral-600">
                {kind === "nextDay" && t.getItBy.replace("{date}", tomorrow)}
                {kind === "express" && (
                  <>
                    {before}
                    <span className="text-green-600">{t.twoHours}</span>
                    {after}
                  </>
                )}
                {kind === "pickup" && t.collectFromStore}
              </span>
            </span>
            <span className={pillClass}>{cost > 0 ? formatPrice(cost, locale) : dict.cart.free}</span>
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
    <div role="radiogroup" aria-label={t.payment} className="divide-y divide-neutral-300 rounded-md border border-neutral-300 px-4 sm:ms-12 sm:px-6">
      {choices.map((choice) => {
        const code = choice.gateway || choice.method;
        const logo = LOGOS[code];
        return (
          <div key={choice.key} className="py-6">
            <label className="flex cursor-pointer items-center gap-5">
              <input
                type="radio"
                name="payment"
                value={choice.key}
                checked={value === choice.key}
                onChange={() => onChange(choice)}
                className={radioClass}
              />
              {logo && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logo.src}
                  alt=""
                  width={logo.width}
                  className={`h-auto ${logo.dark ? "" : "rounded border border-neutral-200 bg-white p-1"}`}
                />
              )}
              {code === "cashondelivery" && <CodBadge />}
              <span className="tracking-wide text-brand">{choice.label}</span>
            </label>
            {code === "cashondelivery" && (
              <p className="mt-4 ps-10 text-sm font-semibold tracking-wide text-brand">{t.codNote}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
