"use client";

import { useActionState } from "react";
import { couponAction } from "@/app/actions/cart";
import type { Dictionary } from "@/i18n/dictionaries";
import { errorText } from "@/i18n/errors";

export function CouponForm({
  locale,
  coupon,
  dict,
}: {
  locale: string;
  coupon: string;
  dict: Pick<Dictionary, "cart" | "errors">;
}) {
  const [state, action, pending] = useActionState(couponAction, undefined);

  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="locale" value={locale} />
      {coupon ? (
        <div className="flex items-center justify-between gap-2 text-sm">
          <span>{dict.cart.applied.replace("{code}", coupon)}</span>
          <button
            type="submit"
            name="remove"
            value="1"
            disabled={pending}
            className="text-neutral-500 underline"
          >
            {dict.cart.removeCoupon}
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <label className="sr-only" htmlFor="coupon">
            {dict.cart.coupon}
          </label>
          <input
            id="coupon"
            name="code"
            placeholder={dict.cart.coupon}
            className="min-w-0 flex-1 rounded border border-neutral-300 px-3 py-2"
          />
          <button
            type="submit"
            disabled={pending}
            className="rounded border border-neutral-800 px-4 py-2 text-sm font-semibold"
          >
            {dict.cart.apply}
          </button>
        </div>
      )}
      {state?.ok === false && (
        <p role="alert" className="text-sm text-brand-accent">
          {errorText(dict, state.error)}
        </p>
      )}
    </form>
  );
}
